// ============================================
// CONTROLLER DE TIMES
// ============================================
// Gerencia equipes do técnico autenticado.
// "category" é texto livre (ex: "Sub-17", "Adulto Feminino") — ver
// DOCUMENTACAO_REGRA_NEGOCIO.md pra entender por que não é uma tabela
// separada.

import { v4 as uuid } from 'uuid';
import { supabase } from '../config/supabase.js';

// GET /api/teams — lista as equipes do técnico logado
export const listarTimes = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      return res.status(400).json({ mensagem: 'Erro ao buscar times', erro: error.message });
    }

    res.status(200).json(data);
  } catch (erro) {
    res.status(500).json({ mensagem: 'Erro interno do servidor', erro: erro.message });
  }
};

// GET /api/teams/:id
export const buscarTime = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = req.params.id;

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ mensagem: 'Time não encontrado' });
      }
      return res.status(400).json({ mensagem: 'Erro ao buscar time', erro: error.message });
    }

    res.status(200).json(data);
  } catch (erro) {
    res.status(500).json({ mensagem: 'Erro interno do servidor', erro: erro.message });
  }
};

// POST /api/teams — Body: { name, category }
export const criarTime = async (req, res) => {
  try {
    const userId = req.user.id;
    const name = req.body.name?.trim();
    const category = req.body.category?.trim();

    if (!name) {
      return res.status(400).json({ mensagem: 'Nome da equipe é obrigatório' });
    }
    if (!category) {
      return res.status(400).json({ mensagem: 'Categoria é obrigatória' });
    }

    // duplicidade: mesmo técnico não pode ter duas equipes com o mesmo
    // nome (evita criar "Sub-17" duas vezes sem querer)
    const { data: existente } = await supabase
      .from('teams')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', name)
      .maybeSingle();

    if (existente) {
      return res.status(409).json({ mensagem: `Você já tem uma equipe chamada "${name}"` });
    }

    const novoTime = { id: uuid(), user_id: userId, name, category };

    const { data, error } = await supabase.from('teams').insert([novoTime]).select();

    if (error) {
      return res.status(400).json({ mensagem: 'Erro ao criar time', erro: error.message });
    }

    res.status(201).json({ mensagem: 'Equipe criada com sucesso', time: data[0] });
  } catch (erro) {
    res.status(500).json({ mensagem: 'Erro interno do servidor', erro: erro.message });
  }
};

// PUT /api/teams/:id — Body: { name?, category? }
export const atualizarTime = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = req.params.id;
    const name = req.body.name?.trim();
    const category = req.body.category?.trim();

    if (!name && !category) {
      return res.status(400).json({ mensagem: 'Informe nome ou categoria para atualizar' });
    }

    const { data: timeVerify, error: verifyError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('user_id', userId)
      .single();

    if (verifyError || !timeVerify) {
      return res.status(404).json({ mensagem: 'Time não encontrado ou não pertence a você' });
    }

    const camposAtualizar = {};
    if (name) camposAtualizar.name = name;
    if (category) camposAtualizar.category = category;

    const { data, error } = await supabase
      .from('teams')
      .update(camposAtualizar)
      .eq('id', teamId)
      .select();

    if (error) {
      return res.status(400).json({ mensagem: 'Erro ao atualizar time', erro: error.message });
    }

    res.status(200).json({ mensagem: 'Time atualizado com sucesso', time: data[0] });
  } catch (erro) {
    res.status(500).json({ mensagem: 'Erro interno do servidor', erro: erro.message });
  }
};

// DELETE /api/teams/:id
export const deletarTime = async (req, res) => {
  try {
    const userId = req.user.id;
    const teamId = req.params.id;

    const { data: timeVerify, error: verifyError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('user_id', userId)
      .single();

    if (verifyError || !timeVerify) {
      return res.status(404).json({ mensagem: 'Time não encontrado ou não pertence a você' });
    }

    const { error } = await supabase.from('teams').delete().eq('id', teamId);

    if (error) {
      // FK sem cascade: se a equipe já tem jogos, o Postgres recusa o
      // delete em vez de deixar dado órfão — devolve mensagem clara em
      // vez do erro cru do Postgres
      if (error.code === '23503') {
        return res.status(409).json({
          mensagem: 'Não é possível excluir: esta equipe já tem jogos ou jogadores cadastrados'
        });
      }
      return res.status(400).json({ mensagem: 'Erro ao deletar time', erro: error.message });
    }

    res.status(200).json({ mensagem: 'Time removido com sucesso' });
  } catch (erro) {
    res.status(500).json({ mensagem: 'Erro interno do servidor', erro: erro.message });
  }
};
