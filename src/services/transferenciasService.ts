import { supabase } from '../lib/supabase'
import type {
  TransferenciaBaseView,
  CriarTransferenciaBaseDTO,
  EnviarTransferenciaDTO,
  ReceberTransferenciaDTO,
  HistoricoTransferenciaLog,
  Base,
  Contrato,
  ItemEstoque
} from '../types/transferencias'

export const transferenciasService = {
  async getTransferencias(): Promise<TransferenciaBaseView[]> {
    const { data, error } = await supabase
      .from('vw_transferencias_bases')
      .select('*')
      .order('data_solicitacao', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getBases(): Promise<Base[]> {
    const { data, error } = await supabase
      .from('bases')
      .select('*')
      .eq('ativa', true)
      .order('nome')
    
    if (error) throw error
    return data || []
  },

  async getContratos(): Promise<Contrato[]> {
    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .eq('status', 'ativo')
      .order('nome')
    
    if (error) throw error
    return data || []
  },

  async getItensEstoque(): Promise<ItemEstoque[]> {
    const { data, error } = await supabase
      .from('itens_estoque')
      .select('*')
      .eq('status', 'ativo')
      .order('nome')
    
    if (error) throw error
    return data || []
  },

  async getHistorico(): Promise<HistoricoTransferenciaLog[]> {
    const { data, error } = await supabase
      .from('historico_transferencias_bases')
      .select(`
        *,
        usuario:usuarios!historico_transferencias_bases_usuario_id_fkey(id, nome, email),
        transferencia:transferencias_bases!historico_transferencias_bases_transferencia_id_fkey(
          numero_transferencia,
          base_origem:bases!transferencias_bases_base_origem_id_fkey(nome),
          base_destino:bases!transferencias_bases_base_destino_id_fkey(nome)
        )
      `)
      .order('criado_em', { ascending: false })
      .limit(100)
    
    if (error) throw error
    return data || []
  },

  async criarTransferencia(dto: CriarTransferenciaBaseDTO, userId: string): Promise<string> {
    const { data: numeroData, error: numeroError } = await supabase
      .rpc('gerar_numero_transferencia')
    
    if (numeroError) throw numeroError

    const { error } = await supabase
      .from('transferencias_bases')
      .insert([{
        ...dto,
        numero_transferencia: numeroData,
        solicitante_id: userId
      }])
    
    if (error) throw error
    
    return numeroData
  },

  async enviarTransferencia(dto: EnviarTransferenciaDTO, userId: string): Promise<void> {
    const { error } = await supabase
      .from('transferencias_bases')
      .update({
        status: 'em_transito',
        data_envio: new Date().toISOString().split('T')[0],
        enviado_por_id: userId,
        tipo_transporte: dto.tipo_transporte,
        documento_transporte: dto.documento_transporte,
        custo_transporte: dto.custo_transporte,
        condicao_envio: dto.condicao_envio,
        observacoes_envio: dto.observacoes_envio
      })
      .eq('id', dto.transferencia_id)
    
    if (error) throw error
  },

  async receberTransferencia(dto: ReceberTransferenciaDTO, userId: string): Promise<void> {
    const { error } = await supabase
      .from('transferencias_bases')
      .update({
        status: 'concluida',
        data_recebimento: dto.data_recebimento || new Date().toISOString().split('T')[0],
        recebido_por_id: userId,
        condicao_recebimento: dto.condicao_recebimento,
        observacoes_recebimento: dto.observacoes_recebimento
      })
      .eq('id', dto.transferencia_id)
    
    if (error) throw error
  }
}
