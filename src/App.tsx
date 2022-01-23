import React, { useRef, useState } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { useAuth } from "./use-auth";
import LoginPage from "./LoginPage";
import { usePeerConnection } from "./use-pc";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <PublicPage />
          </RequireAuth>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/protected"
        element={
          <RequireAuth>
            <ProtectedPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  let auth = useAuth();
  let location = useLocation();

  if (!auth.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

const db = getFirestore();

function PublicPage() {
  const { pc } = usePeerConnection();
  const localVideoRef = useRef<any>();
  const remoteVideoRef = useRef<any>();
  const [localVideo, setLocalVideo] = useState<any>();
  const [remoteVideo, setRemoteVideo] = useState<any>();
  const [webcamButtonDisabled, setWebcamButtonDisabled] = useState(false);
  const [callButtonDisabled, setCallButtonDisabled] = useState(true);
  const [answerButtonDisabled, setAnswerButtonDisabled] = useState(true);
  const [hangupButtonDisabled, setHangupButtonDisabled] = useState(true);
  const [callId, setCallId] = useState<string>("");

  const handleWebcamButtonClick = async () => {
    let localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    let remoteStream = new MediaStream();

    // Push tracks from local stream to peer connection
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Pull tracks from remote stream, add to video stream
    pc.ontrack = (event: any) => {
      event.streams[0].getTracks().forEach((track: any) => {
        remoteStream.addTrack(track);
      });
    };

    let localVideo = localVideoRef.current;
    let remoteVideo = remoteVideoRef.current;
    localVideo.srcObject = localStream;
    remoteVideo.srcObject = remoteStream;
    setCallButtonDisabled(false);
    setAnswerButtonDisabled(false);
    setWebcamButtonDisabled(true);
  };

  const handleCallButtonClick = async () => {
    // Reference Firestore collections for signaling
    const callDoc = doc(collection(db, "calls"));
    console.log("callDocId", callDoc.id);
    const offerCandidates = collection(callDoc, "offerCandidates");
    const answerCandidates = collection(callDoc, "answerCandidates");

    setCallId(callDoc.id);

    // Get candidates for caller, save to db
    pc.onicecandidate = (event: any) => {
      event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
    };

    // Create offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await setDoc(callDoc, { offer });

    // Listen for remote answer
    onSnapshot(callDoc, (snapshot: any) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription);
      }
    });

    // When answered, add candidate to peer connection
    onSnapshot(answerCandidates, (snapshot: any) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });

    setHangupButtonDisabled(false);
  };

  // 3. Answer the call with the unique ID
  const handleAnswerButtonClick = async () => {
    // Reference Firestore collections for signaling
    const callDoc = doc(db, "calls", callId);
    const answerCandidates = collection(callDoc, "answerCandidates");
    const offerCandidates = collection(callDoc, "offerCandidates");

    pc.onicecandidate = (event: any) => {
      event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
    };

    const callData = await (await getDoc(callDoc)).data();

    const offerDescription = callData?.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDoc, { answer });

    onSnapshot(offerCandidates, (snapshot: any) => {
      snapshot.docChanges().forEach((change: any) => {
        if (change.type === "added") {
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };

  return (
    <div>
      <h2>1. Start your Webcam</h2>
      <div className="videos">
        <span>
          <h3>Local Stream</h3>
          <video
            id="webcamVideo"
            autoPlay
            playsInline
            ref={localVideoRef}
          ></video>
        </span>
        <span>
          <h3>Remote Stream</h3>
          <video
            id="remoteVideo"
            autoPlay
            playsInline
            ref={remoteVideoRef}
          ></video>
        </span>
      </div>

      <button
        id="webcamButton"
        type="button"
        disabled={webcamButtonDisabled}
        onClick={handleWebcamButtonClick}
      >
        Start webcam
      </button>
      <h2>2. Create a new Call</h2>
      <button
        id="callButton"
        type="button"
        onClick={handleCallButtonClick}
        disabled={callButtonDisabled}
      >
        Create Call (offer)
      </button>

      <h2>3. Join a Call</h2>
      <p>Answer the call from a different browser window or device</p>

      <input
        id="callInput"
        value={callId}
        onChange={(e) => setCallId(e.target.value)}
      />
      <button
        id="answerButton"
        type="button"
        onClick={handleAnswerButtonClick}
        disabled={answerButtonDisabled}
      >
        Answer
      </button>

      <h2>4. Hangup</h2>

      <button id="hangupButton" type="button" disabled={hangupButtonDisabled}>
        Hangup
      </button>
    </div>
  );
}

function ProtectedPage() {
  return <div>Protected</div>;
}
