import { supabase } from '../lib/supabase';

export const moduloPredefinidoService = {
    async getModulosPredefinidos() {
        const { data, error } = await supabase
            .from('modulos_predefinidos')
            .select(`
        id,
        nome_modulo,
        descricao,
        ativo,
        itens:itens_modulo_predefinido(
          id,
          item_estoque_id,
          quantidade_padrao,
          item:itens_estoque(id, nome, codigo, categoria)
        )
      `)
            .eq('ativo', true)
            .order('nome_modulo');

        if (error) {
            console.error('❌ [moduloPredefinidoService] Error fetching modules:', error);
            throw error;
        }

        return data || [];
    }
};

export const moduloPredefinidoEquipeService = {
    async getModulosPredefinidosEquipe(equipeId?: string) {
        let query = supabase
            .from('modulos_predefinidos_equipe')
            .select(`
                id,
                equipe_id,
                nome_modulo,
                descricao,
                ativo,
                itens:itens_modulo_equipe!modulo_equipe_id(
                    id,
                    item_estoque_id,
                    quantidade_padrao,
                    item:itens_estoque!item_estoque_id(id, nome, codigo, categoria)
                )
            `)
            .eq('ativo', true)
            .order('nome_modulo');

        if (equipeId) {
            query = query.eq('equipe_id', equipeId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ [moduloPredefinidoEquipeService] Error fetching team modules:', error);
            throw error;
        }

        return data || [];
    },

    async createModulo(nome: string, descricao: string, equipe_id: string, items: Array<{ item_id: string; quantidade: number }>) {
        if (!equipe_id) throw new Error("Equipe ID is required");

        // 1. Create Module
        const { data: modulo, error: modError } = await supabase
            .from('modulos_predefinidos_equipe')
            .insert({
                nome_modulo: nome,
                descricao,
                equipe_id,
                ativo: true
            })
            .select()
            .single();

        if (modError) throw modError;

        // 2. Add Items
        if (items.length > 0) {
            const itemsToInsert = items.map(i => ({
                modulo_equipe_id: modulo.id,
                item_estoque_id: i.item_id,
                quantidade_padrao: i.quantidade
            }));

            const { error: itemsError } = await supabase
                .from('itens_modulo_equipe')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        return modulo;
    },

    async deleteModulo(id: string) {
        const { error } = await supabase
            .from('modulos_predefinidos_equipe')
            .update({ ativo: false })
            .eq('id', id);

        if (error) throw error;
    }
};
