import { supabase } from '../lib/supabase';

export const catalogoService = {
    async getItensCatalogoComEstoque(baseId: string) {
        const { data, error } = await supabase
            .from('itens_estoque')
            .select(`
        id,
        nome,
        codigo,
        categoria,
        estoque_atual,
        estoque_minimo,
        base_id
      `)
            .eq('base_id', baseId)
            .eq('ativo', true)
            .order('nome');

        if (error) {
            console.error('❌ [catalogoService] Error fetching catalog items:', error);
            throw error;
        }

        return data || [];
    },

    async searchItems(query: string, baseId: string) {
        const searchTerm = query.toLowerCase();

        const { data, error } = await supabase
            .from('itens_estoque')
            .select(`
        id,
        nome,
        codigo,
        categoria,
        estoque_atual,
        estoque_minimo,
        base_id
      `)
            .eq('base_id', baseId)
            .eq('ativo', true)
            .or(`nome.ilike.%${searchTerm}%,codigo.ilike.%${searchTerm}%,categoria.ilike.%${searchTerm}%`)
            .order('nome')
            .limit(50);

        if (error) {
            console.error('❌ [catalogoService] Error searching items:', error);
            throw error;
        }

        return data || [];
    }
};
