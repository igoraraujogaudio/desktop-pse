import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    session: any | null;
}

// Simple internal hook if not using Context provider (since App.tsx manages state but doesn't expose Context yet)
// Ideally we should use a Provider, but for now we'll fetch direct or share state if we refactor App.tsx.
// For the desktop app's current structure, likely better to just use supabase directly or this hook.

export function useAuth(): AuthContextType {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                // Fetch full user profile from 'usuarios' table if needed, or just map session.user
                // For now, let's try to get profile from 'usuarios' matching email/id
                fetchUserProfile(session.user);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                fetchUserProfile(session.user);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (authUser: any) => {
        try {
            console.log('🔍 [useAuth] Fetching user profile for auth user:', authUser.id, authUser.email);

            // Try to get by ID first
            let { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();

            console.log('📊 [useAuth] Query result:', { data, error });

            if (error) {
                console.error('❌ [useAuth] Error querying usuarios table:', error);
            }

            if (!data) {
                console.warn('⚠️ [useAuth] User not found by ID, trying by email...');
                // Fallback to email if needed
                const emailResult = await supabase
                    .from('usuarios')
                    .select('*')
                    .eq('email', authUser.email)
                    .maybeSingle();

                console.log('📊 [useAuth] Email query result:', emailResult);
                data = emailResult.data;
            }

            if (!data) {
                console.error('❌ [useAuth] User profile not found in usuarios table');
                // Create a temporary User object from auth data
                const tempUser: User = {
                    id: authUser.id,
                    email: authUser.email || '',
                    nome: authUser.user_metadata?.full_name || authUser.email || 'Usuário',
                    matricula: '',
                    nivel_acesso: 'operacao',
                    ativo: true,
                    criado_em: new Date().toISOString(),
                };
                console.log('⚠️ [useAuth] Using temporary user:', tempUser);
                setUser(tempUser);
            } else {
                console.log('✅ [useAuth] User profile loaded successfully:', data.nome, data.email, data.id);
                setUser(data as User);
            }
        } catch (e) {
            console.error('❌ [useAuth] Exception in fetchUserProfile:', e);
        } finally {
            setLoading(false);
        }
    };

    return { user, loading, session };
}
