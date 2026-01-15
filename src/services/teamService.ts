import { supabase } from '../lib/supabase';

export const teamService = {
    async getEquipesAtivas() {
        const { data, error } = await supabase
            .from('equipes')
            .select('id, nome, operacao, status, contrato_id, base_id')
            .eq('status', 'ativa')
            .order('nome');

        if (error) {
            console.error('❌ [teamService] Error fetching active teams:', error);
            throw error;
        }

        return data || [];
    },

    async searchTeams(query: string) {
        const searchTerm = query.toLowerCase();

        const { data, error } = await supabase
            .from('equipes')
            .select('id, nome, operacao, status, contrato_id, base_id')
            .eq('status', 'ativa')
            .or(`nome.ilike.%${searchTerm}%,operacao.ilike.%${searchTerm}%`)
            .order('nome')
            .limit(50);

        if (error) {
            console.error('❌ [teamService] Error searching teams:', error);
            throw error;
        }

        return data || [];
    },

    async getTeamMembers(teamId: string) {
        const { data, error } = await supabase
            .from('membros_equipe')
            .select(`
                id,
                funcionario:usuarios!membros_equipe_funcionario_id_fkey(id, nome, matricula)
            `)
            .eq('equipe_id', teamId)
            .eq('status', 'ativo');

        if (error) {
            console.error('❌ [teamService] Error fetching team members:', error);
            throw error;
        }

        return data?.map(d => d.funcionario) || [];
    }
};
