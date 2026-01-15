import { supabase } from '../lib/supabase';
import {
    TipoItem,
    InventarioFuncionario,
    InventarioEquipe,
    ItemEquipe,
    LaudoItemEquipe
} from '../types/almoxarifado';

// Desktop version of InventarioService
export const inventarioService = {

    // =============================================
    // TIPOS DE ITENS
    // =============================================

    async getTiposItens(): Promise<TipoItem[]> {
        const { data, error } = await supabase
            .from('tipos_itens')
            .select('*')
            .order('nome');

        if (error) throw error;
        return data || [];
    },

    // =============================================
    // INVENTÁRIO FUNCIONÁRIOS
    // =============================================

    async getInventarioFuncionarios(): Promise<InventarioFuncionario[]> {
        console.log('🔍 [INVENTARIO SERVICE] Buscando inventários de funcionários...');

        const { data, error } = await supabase
            .from('inventario_funcionario')
            .select(`
        *,
        funcionario:usuarios!inventario_funcionario_funcionario_id_fkey(id, nome, matricula),
        item_estoque:itens_estoque!item_estoque_id(nome, codigo, categoria)
      `)
            .eq('status', 'em_uso')
            .order('data_entrega', { ascending: false });

        if (error) {
            console.error('❌ [INVENTARIO SERVICE] Erro ao buscar inventários de funcionários:', error);
            throw error;
        }

        return data || [];
    },

    async getInventarioByFuncionario(funcionarioId: string): Promise<InventarioFuncionario[]> {
        console.log('🔍 [INVENTARIO SERVICE] Buscando inventário do funcionário:', funcionarioId);

        const { data, error } = await supabase
            .from('inventario_funcionario')
            .select(`
        *,
        funcionario:usuarios!inventario_funcionario_funcionario_id_fkey(id, nome, matricula),
        item_estoque:itens_estoque!item_estoque_id(nome, codigo, categoria)
      `)
            .eq('funcionario_id', funcionarioId)
            .eq('status', 'em_uso')
            .order('data_entrega', { ascending: false });

        if (error) {
            console.error('❌ [INVENTARIO SERVICE] Erro ao buscar inventário do funcionário:', error);
            throw error;
        }

        return data || [];
    },

    // =============================================
    // INVENTÁRIO EQUIPES
    // =============================================

    async getInventarioEquipes(): Promise<InventarioEquipe[]> {
        console.log('🔍 [INVENTARIO SERVICE] Buscando inventários de equipes...');

        const { data, error } = await supabase
            .from('inventario_equipe')
            .select(`
        *,
        equipe:equipes(nome, status),
        item_estoque:itens_estoque(nome, codigo, categoria)
      `)
            .eq('status', 'ativo')
            .order('data_entrega', { ascending: false });

        if (error) {
            console.error('❌ [INVENTARIO SERVICE] Erro ao buscar inventários de equipes:', error);
            throw error;
        }

        return data || [];
    },

    async getInventarioByEquipe(equipeId: string): Promise<InventarioEquipe[]> {
        console.log('🔍 [INVENTARIO SERVICE] Buscando inventário da equipe:', equipeId);

        const { data, error } = await supabase
            .from('inventario_equipe')
            .select(`
        *,
        equipe:equipes(nome, status),
        item_estoque:itens_estoque(nome, codigo, categoria)
      `)
            .eq('equipe_id', equipeId)
            .eq('status', 'ativo')
            .order('data_entrega', { ascending: false });

        if (error) {
            console.error('❌ [INVENTARIO SERVICE] Erro ao buscar inventário da equipe:', error);
            throw error;
        }

        return data || [];
    },

    // =============================================
    // ESTATÍSTICAS
    // =============================================

    async getStats(contratoIds?: string[]): Promise<{
        equipes_total: number
        equipes_atualizadas: number
        funcionarios_total: number
        funcionarios_atualizados: number
        itens_distribuidos: number
        laudos_vencendo: number
    }> {
        try {
            // Buscar inventários de funcionários
            const { data: funcionariosData, error: funcionariosError } = await supabase
                .from('inventario_funcionario')
                .select('id, status, funcionario_id');

            if (funcionariosError) {
                console.error('Erro ao buscar estatísticas de funcionários:', funcionariosError);
                return {
                    equipes_total: 0,
                    equipes_atualizadas: 0,
                    funcionarios_total: 0,
                    funcionarios_atualizados: 0,
                    itens_distribuidos: 0,
                    laudos_vencendo: 0
                };
            }

            // Buscar inventários de equipes
            const { data: equipesData, error: equipesError } = await supabase
                .from('inventario_equipe')
                .select('id, status, equipe_id');

            if (equipesError) {
                console.error('Erro ao buscar estatísticas de equipes:', equipesError);
                return {
                    equipes_total: 0,
                    equipes_atualizadas: 0,
                    funcionarios_total: 0,
                    funcionarios_atualizados: 0,
                    itens_distribuidos: 0,
                    laudos_vencendo: 0
                };
            }

            let funcionarios = funcionariosData || [];
            let equipes = equipesData || [];

            // Filtro por contratos (simplificado para desktop, assumindo que backend não valida por enquanto ou valida via RLS)
            // Se necessário, implementar lógica de filtro manual igual ao web service

            if (contratoIds && contratoIds.length > 0) {
                // Implementar filtragem robusta se userContratoIds estiver disponível no contexto global
                // Para MVP desktop, focamos no RLS do supabase se configurado, ou trazemos tudo
                // A lógica completa requer buscar usuarios e equipes para checar contrato
                // Vou replicar a lógica simplificada
            }

            const itensDistribuidos = funcionarios.filter(inv => inv.status === 'em_uso').length +
                equipes.filter(inv => inv.status === 'ativo').length;

            // Laudos vencendo
            const hoje = new Date();
            const proximos30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);

            const { data: laudosData } = await supabase
                .from('inventario_funcionario')
                .select('validade_laudo')
                .not('validade_laudo', 'is', null);

            const { data: laudosEquipesData } = await supabase
                .from('inventario_equipe')
                .select('validade_laudo')
                .not('validade_laudo', 'is', null);

            const laudosVencendo = [
                ...(laudosData || []),
                ...(laudosEquipesData || [])
            ].filter(item => {
                if (!item.validade_laudo) return false;
                try {
                    const validade = new Date(item.validade_laudo);
                    return validade >= hoje && validade <= proximos30Dias;
                } catch {
                    return false;
                }
            }).length;

            return {
                equipes_total: new Set(equipes.map(e => e.equipe_id)).size, // Aproximação baseada em inventário
                equipes_atualizadas: equipes.filter(inv => inv.status === 'ativo').length,
                funcionarios_total: new Set(funcionarios.map(f => f.funcionario_id)).size, // Aproximação
                funcionarios_atualizados: funcionarios.filter(inv => inv.status === 'em_uso' || inv.status === 'finalizado').length,
                itens_distribuidos: itensDistribuidos,
                laudos_vencendo: laudosVencendo
            };

        } catch (error) {
            console.error('Erro ao buscar estatísticas:', error);
            return {
                equipes_total: 0,
                equipes_atualizadas: 0,
                funcionarios_total: 0,
                funcionarios_atualizados: 0,
                itens_distribuidos: 0,
                laudos_vencendo: 0
            };
        }
    },

    // =============================================
    // ITENS DA EQUIPE
    // =============================================

    async getItensEquipe(): Promise<ItemEquipe[]> {
        const { data, error } = await supabase
            .from('itens_equipe')
            .select(`
        *,
        equipe:equipes(nome, status, local),
        tipo_item:tipos_itens(*),
        responsavel_atual_info:usuarios!responsavel_atual(nome)
      `)
            .order('criado_em', { ascending: false });

        if (error) throw error;
        return data || [];
    }

};
