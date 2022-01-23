import { createContext, useContext, useEffect, useState } from "react";

const PeerConnectionContext = createContext<any>(null!);

export function PeerConnectionProvider({ children }: any) {
  const pc = usePeerConnectionProvider();
  return (
    <PeerConnectionContext.Provider value={pc}>
      {pc.loading ? <div>Loading...</div> : children}
    </PeerConnectionContext.Provider>
  );
}

export const usePeerConnection = () => {
  return useContext(PeerConnectionContext);
};

const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
  };

function usePeerConnectionProvider() {
  const [pc, setPC] = useState<any>(new RTCPeerConnection(servers));
  const [loading, setLoading] = useState<any>(false);

  return {
    pc,
    loading,
  };
}
