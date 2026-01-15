import { supabase } from '../lib/supabase';

export const userService = {
    async getUsuariosAtivos() {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nome, email, matricula, cargo')
            .eq('ativo', true)
            .neq('status', 'demitido')
            .order('nome');

        if (error) {
            console.error('❌ [userService] Error fetching active users:', error);
            throw error;
        }

        return data || [];
    },

    async searchUsers(query: string) {
        const searchTerm = query.toLowerCase();

        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nome, email, matricula, cargo')
            .eq('ativo', true)
            .neq('status', 'demitido')
            .or(`nome.ilike.%${searchTerm}%,matricula.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
            .order('nome')
            .limit(50);

        if (error) {
            console.error('❌ [userService] Error searching users:', error);
            throw error;
        }

        return data || [];
    }
};
