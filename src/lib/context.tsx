"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { GlobalSample, SessionWithSamples } from './types';
import { 
  getAllSessions, 
  saveSession, 
  deleteSession as dbDeleteSession,
  getAllGlobalSamples,
  saveGlobalSample,
  deleteGlobalSample as dbDeleteGlobalSample
} from './db';

interface SessionContextType {
  sessions: SessionWithSamples[];
  globalSamples: GlobalSample[];
  loading: boolean;
  addSession: (session: SessionWithSamples) => Promise<void>;
  updateSession: (session: SessionWithSamples) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  
  addGlobalSample: (sample: GlobalSample) => Promise<void>;
  updateGlobalSample: (sample: GlobalSample) => Promise<void>;
  deleteGlobalSample: (id: string) => Promise<void>;
  refreshGlobalSamples: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<SessionWithSamples[]>([]);
  const [globalSamples, setGlobalSamples] = useState<GlobalSample[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSessions = async () => {
    try {
      const data = await getAllSessions();
      // Sort by date desc
      data.sort((a, b) => new Date(b.cuppingDate).getTime() - new Date(a.cuppingDate).getTime());
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  };

  const refreshGlobalSamples = async () => {
    try {
      const data = await getAllGlobalSamples();
      // Sort by created date desc
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setGlobalSamples(data);
    } catch (error) {
      console.error("Failed to load global samples:", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([refreshSessions(), refreshGlobalSamples()]);
      setLoading(false);
    };
    init();
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

  const addGlobalSample = async (sample: GlobalSample) => {
    await saveGlobalSample(sample);
    await refreshGlobalSamples();
  };

  const updateGlobalSample = async (sample: GlobalSample) => {
    await saveGlobalSample(sample);
    await refreshGlobalSamples();
  };

  const deleteGlobalSample = async (id: string) => {
    await dbDeleteGlobalSample(id);
    await refreshGlobalSamples();
  };

  return (
    <SessionContext.Provider value={{ 
      sessions, 
      globalSamples,
      loading, 
      addSession, 
      updateSession, 
      deleteSession, 
      refreshSessions,
      addGlobalSample,
      updateGlobalSample,
      deleteGlobalSample,
      refreshGlobalSamples
    }}>
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
