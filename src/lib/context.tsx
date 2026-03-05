"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { SessionWithSamples } from './types';
import { getAllSessions, saveSession, deleteSession as dbDeleteSession } from './db';

interface SessionContextType {
  sessions: SessionWithSamples[];
  loading: boolean;
  addSession: (session: SessionWithSamples) => Promise<void>;
  updateSession: (session: SessionWithSamples) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<SessionWithSamples[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSessions = async () => {
    setLoading(true);
    try {
      const data = await getAllSessions();
      // Sort by date desc
      data.sort((a, b) => new Date(b.cuppingDate).getTime() - new Date(a.cuppingDate).getTime());
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSessions();
  }, []);

  const addSession = async (session: SessionWithSamples) => {
    await saveSession(session);
    await refreshSessions();
  };

  const updateSession = async (session: SessionWithSamples) => {
    await saveSession(session);
    await refreshSessions();
  };

  const deleteSession = async (id: string) => {
    await dbDeleteSession(id);
    await refreshSessions();
  };

  return (
    <SessionContext.Provider value={{ sessions, loading, addSession, updateSession, deleteSession, refreshSessions }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessions() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessions must be used within a SessionProvider');
  }
  return context;
}
