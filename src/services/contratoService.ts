import { supabase } from '../lib/supabase';
import type { Contrato, UsuarioContrato } from '../types/contratos';

export const contratoService = {
    async getContratosAtivos(): Promise<Contrato[]> {
        const { data, error } = await supabase
            .from('contratos')
            .select('*')
            .eq('status', 'ativo')
            .order('nome', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async getUserContratos(userId: string): Promise<UsuarioContrato[]> {
        const { data, error } = await supabase
            .from('usuario_contratos')
            .select(`
        *,
        contrato:contratos(*)
      `)
            .eq('usuario_id', userId)
            .eq('ativo', true);

        if (error) throw error;
        return data || [];
    }
};
