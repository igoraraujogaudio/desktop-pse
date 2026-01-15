// Types para sistema de permissões modulares

import type { User } from '../types';
// @ts-ignore
import type { UsuarioContrato, UsuarioBase } from './contratos';

// ============================================================================
// 🎯 SISTEMA BÁSICO (COMPATIBILIDADE)
// ============================================================================

export interface Funcionalidade {
    id: string;
    codigo: string;
    nome: string;
    modulo: string;
    descricao?: string;
    nivel_minimo?: string;
    categoria: 'visualizacao' | 'edicao' | 'criacao' | 'exclusao' | 'aprovacao';
    ativa: boolean;
    created_at: string;
    updated_at: string;
}

// ============================================================================
// 🎯 SISTEMA MODULAR (NOVO)
// ============================================================================

export interface FuncionalidadeModular {
    id: string;
    codigo: string;
    nome: string;
    descricao?: string;
    modulo_id: string;
    plataforma_id: string;
    categoria: string;
    sub_categoria?: string;
    nivel_minimo?: string;
    requer_aprovacao: boolean;
    critica: boolean;
    ordem: number;
    ativa: boolean;
    criado_em: string;
    atualizado_em: string;

    // Relacionamentos
    modulo?: ModuloSistema;
    plataforma?: Plataforma;
}

export interface ModuloSistema {
    id: string;
    codigo: string;
    nome: string;
    descricao?: string;
    icone?: string;
    cor?: string;
    ordem: number;
    ativo: boolean;
    criado_em: string;
}

export interface Plataforma {
    id: string;
    codigo: string;
    nome: string;
    descricao?: string;
    ativa: boolean;
    criado_em: string;
}

export interface PerfilAcesso {
    id: string;
    codigo: string;
    nome: string;
    descricao?: string;
    nivel_hierarquia: number;
    cor?: string;
    ativo: boolean;
    criado_em: string;
}

export interface UsuarioPermissaoModular {
    id: string;
    usuario_id: string;
    funcionalidade_id: string;
    concedido: boolean;
    tipo_permissao: 'adicional' | 'restricao';
    motivo?: string;
    concedido_por?: string;
    data_inicio: string;
    data_fim?: string;
    ativo: boolean;
    temporaria: boolean;
    criado_em: string;
    atualizado_em: string;

    // Relacionamentos
    funcionalidade?: FuncionalidadeModular;
    concedido_por_usuario?: User;
}

export interface GrupoPermissoesModulares {
    id: string;
    nome: string;
    descricao?: string;
    modulo_id?: string;
    plataforma_id?: string;
    publico: boolean;
    criado_por?: string;
    ativo: boolean;
    criado_em: string;

    // Relacionamentos
    modulo?: ModuloSistema;
    plataforma?: Plataforma;
    criado_por_usuario?: User;
}

export interface PerfilFuncionalidadesPadrao {
    id: string;
    perfil_id: string;
    funcionalidade_id: string;
    concedido: boolean;
    criado_em: string;

    // Relacionamentos
    perfil?: PerfilAcesso;
    funcionalidade?: FuncionalidadeModular;
}

export interface UsuarioFuncionalidade {
    id: string;
    usuario_id: string;
    funcionalidade_id: string;
    concedido: boolean;
    tipo_permissao: 'adicional' | 'restricao';
    motivo?: string;
    data_inicio?: string;
    data_fim?: string;
    ativo: boolean;
    created_at: string;
    created_by?: string;
    funcionalidade?: Funcionalidade;
}

export interface GrupoPermissao {
    id: string;
    nome: string;
    descricao?: string;
    ativo: boolean;
    created_at: string;
    grupo_funcionalidades?: GrupoFuncionalidade[];
}

export interface GrupoFuncionalidade {
    id: string;
    grupo_id: string;
    funcionalidade_id: string;
    funcionalidade?: Funcionalidade;
    grupo?: GrupoPermissao;
}

export interface UseModularPermissionsReturn {
    // Verificação de permissões
    hasPermission: (codigo: string) => boolean;
    hasAnyPermission: (codigos: string[]) => boolean;
    hasAllPermissions: (codigos: string[]) => boolean;
    checkPermission: (codigo: string) => Promise<boolean>;
    checkMultiplePermissions: (codigos: string[]) => Map<string, boolean>;

    // Dados do sistema modular
    funcionalidades: FuncionalidadeModular[];
    modulos: ModuloSistema[];
    plataformas: Plataforma[];
    perfis: PerfilAcesso[];

    // Permissões do usuário
    userPermissions: UsuarioPermissaoModular[];
    customPermissions: UsuarioPermissaoModular[];

    // Estados
    loading: boolean;
    error: string | null;

    // Ações
    refreshPermissions: () => Promise<void>;

    // Estatísticas
    getPermissionStats: () => {
        totalCustom: number;
        additionalPermissions: number;
        restrictions: number;
        modulePermissions: Record<string, number>;
        platformPermissions: Record<string, number>;
        hasCustomPermissions: boolean;
    };
}

export interface UseUnifiedPermissionsReturn {
    // Verificação de permissões (unificada)
    hasPermission: (codigo: string) => boolean;
    hasAnyPermission: (codigos: string[]) => boolean;
    hasAllPermissions: (codigos: string[]) => boolean;
    checkPermission: (codigo: string) => Promise<boolean>;

    // Verificação por nível (sistema antigo)
    hasAccessLevel: (requiredLevel: string) => boolean;
    canManageUser: (targetUserLevel: string) => boolean;

    // Dados do usuário
    user: User | null;
    userPermissions: UsuarioFuncionalidade[];
    customPermissions: UsuarioFuncionalidade[];
    funcionalidades: Funcionalidade[];

    // Contratos e bases
    userContratos: UsuarioContrato[];
    userBases: UsuarioBase[];
    hasContratoAccess: (contratoId: string) => boolean;
    hasBaseAccess: (baseId: string) => boolean;
    getBaseAccessType: (baseId: string) => 'total' | 'restrito' | 'leitura' | null;

    // Estados
    loading: boolean;
    error: string | null;

    // Ações
    refreshPermissions: () => Promise<void>;

    // Estatísticas e informações
    getPermissionStats: () => {
        totalCustom: number;
        additionalPermissions: number;
        restrictions: number;
        modulePermissions: Record<string, number>;
        hasCustomPermissions: boolean;
        userLevel: string;
        hierarchyIndex: number;
    };

    // Constantes
    ACCESS_HIERARCHY: string[];
}
