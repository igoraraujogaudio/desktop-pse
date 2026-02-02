// =============================================
// Tipos para Transferências Entre Bases
// =============================================

export type StatusTransferencia = 'pendente' | 'em_transito' | 'concluida' | 'cancelada'
export type PrioridadeTransferencia = 'baixa' | 'normal' | 'alta' | 'urgente'
export type CondicaoItem = 'novo' | 'bom' | 'regular' | 'ruim' | 'danificado'

export interface TransferenciaBaseView {
  id: string
  numero_transferencia: string
  item_estoque_id: string
  item_nome: string
  item_codigo: string
  quantidade: number
  unidade_medida: string
  base_origem_id: string
  base_origem_nome: string
  base_destino_id: string
  base_destino_nome: string
  contrato_origem_id?: string
  contrato_origem_nome?: string
  contrato_destino_id?: string
  contrato_destino_nome?: string
  entre_contratos: boolean
  status: StatusTransferencia
  prioridade: PrioridadeTransferencia
  motivo: string
  data_solicitacao: string
  data_envio?: string
  data_recebimento?: string
  previsao_chegada?: string
  solicitante_id: string
  solicitante_nome: string
  solicitante_email?: string
  enviado_por_id?: string
  enviado_por_nome?: string
  recebido_por_id?: string
  recebido_por_nome?: string
  tipo_transporte?: string
  documento_transporte?: string
  custo_transporte?: number
  condicao_envio?: CondicaoItem
  condicao_recebimento?: CondicaoItem
  observacoes_solicitacao?: string
  observacoes_envio?: string
  observacoes_recebimento?: string
  dias_em_transito?: number
  em_atraso?: boolean
  dias_atraso?: number
  criado_em: string
  atualizado_em: string
}

export interface CriarTransferenciaBaseDTO {
  item_estoque_id: string
  quantidade: number
  base_origem_id: string
  contrato_origem_id?: string
  base_destino_id: string
  contrato_destino_id?: string
  motivo: string
  prioridade: PrioridadeTransferencia
  previsao_chegada?: string
  condicao_envio?: CondicaoItem
  observacoes_solicitacao?: string
}

export interface EnviarTransferenciaDTO {
  transferencia_id: string
  tipo_transporte?: string
  documento_transporte?: string
  custo_transporte?: number
  condicao_envio?: CondicaoItem
  observacoes_envio?: string
}

export interface ReceberTransferenciaDTO {
  transferencia_id: string
  condicao_recebimento: CondicaoItem
  data_recebimento?: string
  observacoes_recebimento?: string
}

export interface HistoricoTransferenciaLog {
  id: string
  transferencia_id: string
  usuario_id?: string
  acao: 'criacao' | 'aprovacao' | 'rejeicao' | 'envio' | 'recebimento' | 'cancelamento' | 'atualizacao'
  detalhes?: string
  status_anterior?: StatusTransferencia
  status_novo?: StatusTransferencia
  criado_em: string
  usuario?: {
    nome?: string
    email?: string
  }
  transferencia?: {
    numero_transferencia?: string
    base_origem?: {
      nome?: string
    }
    base_destino?: {
      nome?: string
    }
  }
}

export interface Base {
  id: string
  nome: string
  codigo?: string
  contrato_id?: string
  ativa: boolean
  endereco?: string
  cidade?: string
  estado?: string
  responsavel?: string
  observacoes?: string
  criado_em: string
  atualizado_em: string
}

export interface Contrato {
  id: string
  nome: string
  numero?: string
  status: 'ativo' | 'inativo' | 'suspenso' | 'encerrado'
  data_inicio?: string
  data_fim?: string
  cliente?: string
  valor?: number
  observacoes?: string
  criado_em: string
  atualizado_em: string
}

export interface ItemEstoque {
  id: string
  nome: string
  codigo: string
  categoria?: string
  tipo?: string
  unidade_medida: string
  estoque_atual: number
  estoque_minimo?: number
  estoque_maximo?: number
  base_id?: string
  status: 'ativo' | 'inativo'
  valor_unitario?: number
  observacoes?: string
  criado_em: string
  atualizado_em: string
}
