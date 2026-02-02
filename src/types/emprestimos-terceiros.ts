// =============================================
// Tipos para Empréstimos para Empresas Terceiras
// =============================================

export type StatusEmprestimo = 'ativo' | 'devolvido' | 'baixado' | 'perdido' | 'cancelado'
export type TipoOperacao = 'emprestimo' | 'transferencia'
export type CondicaoItem = 'novo' | 'usado_bom' | 'usado_regular' | 'usado_ruim' | 'danificado' | 'inutilizavel'

export interface EmpresaTerceira {
  id: string
  razao_social: string
  nome_fantasia?: string
  cnpj?: string
  observacoes?: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface EmprestimoTerceiroAtivo {
  id: string
  numero_documento: string
  empresa_terceira_id: string
  empresa_razao_social: string
  empresa_cnpj?: string
  item_estoque_id: string
  item_nome: string
  item_codigo: string
  base_id: string
  base_nome: string
  colaborador_nome: string
  colaborador_cpf: string
  colaborador_telefone?: string
  colaborador_funcao?: string
  tipo_operacao: TipoOperacao
  quantidade: number
  quantidade_devolvida: number
  quantidade_pendente: number
  unidade_medida: string
  data_emprestimo: string
  data_previsao_devolucao?: string
  data_devolucao_real?: string
  motivo: string
  projeto_obra?: string
  documento_referencia?: string
  condicao_entrega?: CondicaoItem
  condicao_devolucao?: CondicaoItem
  observacoes_entrega?: string
  observacoes_devolucao?: string
  usuario_responsavel_id?: string
  responsavel_nome?: string
  recebido_por_id?: string
  recebido_por_nome?: string
  status: StatusEmprestimo
  em_atraso?: boolean
  dias_atraso?: number
  criado_em: string
  atualizado_em: string
}

export interface CriarEmpresaTerceiraDTO {
  razao_social: string
  nome_fantasia?: string
  cnpj?: string
  observacoes?: string
}

export interface CriarEmprestimoTerceiroDTO {
  empresa_terceira_id: string
  item_estoque_id: string
  base_id: string
  colaborador_nome: string
  colaborador_cpf: string
  colaborador_telefone?: string
  colaborador_funcao?: string
  tipo_operacao: TipoOperacao
  quantidade: number
  motivo: string
  projeto_obra?: string
  documento_referencia?: string
  data_previsao_devolucao?: string
  condicao_entrega?: CondicaoItem
  observacoes_entrega?: string
}

export interface RegistrarDevolucaoDTO {
  emprestimo_id: string
  quantidade_devolvida: number
  data_devolucao?: string
  condicao_devolucao: CondicaoItem
  observacoes_devolucao?: string
}

export interface HistoricoEmprestimoLog {
  id: string
  emprestimo_id: string
  usuario_id?: string
  acao: 'criacao' | 'devolucao_total' | 'devolucao_parcial' | 'baixa' | 'cancelamento' | 'atualizacao'
  detalhes?: string
  status_anterior?: StatusEmprestimo
  status_novo?: StatusEmprestimo
  quantidade_anterior?: number
  quantidade_nova?: number
  criado_em: string
  usuario?: {
    nome?: string
    email?: string
  }
  emprestimo?: {
    numero_documento?: string
    empresa_terceira?: {
      razao_social?: string
    }
    item_estoque?: {
      nome?: string
      codigo?: string
    }
  }
}

export interface Base {
  id: string
  nome: string
  codigo?: string
  ativa: boolean
  criado_em: string
  atualizado_em: string
}

export interface ItemEstoque {
  id: string
  nome: string
  codigo: string
  categoria?: string
  unidade_medida: string
  estoque_atual: number
  status: 'ativo' | 'inativo'
  criado_em: string
  atualizado_em: string
}
