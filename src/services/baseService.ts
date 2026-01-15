import { supabase } from '../lib/supabase';
import type { Base, UsuarioBase } from '../types/contratos';

export const baseService = {
    async getBasesAtivas(): Promise<Base[]> {
        const { data: todasBases } = await supabase
            .from('bases')
            .select('*')
            .order('nome', { ascending: true });

        // Filter manually or check multiple 'active' formats if needed, similar to web
        // Assuming 'ativa' is boolean in desktop DB schema (which should match web)
        // But web had issues with string/bool, so let's replicate the robust check if we can or just trust boolean.
        // Let's filter in memory to be safe if types differ.

        if (!todasBases) return [];

        // Filter effectively
        const active = todasBases.filter((b: any) => b.ativa === true || b.ativa === 'true');

        // Fetch contracts for active bases (join)
        // Or just return bases. Web does a second query with join.
        // Let's do a clean query with join if possible, but simplest is:

        const { data, error } = await supabase
            .from('bases')
            .select(`
            *,
            contrato:contratos(*)
        `)
            .in('id', active.map(b => b.id))
            .order('nome', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async getUserBases(userId: string): Promise<UsuarioBase[]> {
        const { data, error } = await supabase
            .from('usuario_bases')
            .select(`
        *,
        base:bases(
          *,
          contrato:contratos(*)
        )
      `)
            .eq('usuario_id', userId)
            .eq('ativo', true);

        if (error) throw error;
        return data || [];
    }
};
