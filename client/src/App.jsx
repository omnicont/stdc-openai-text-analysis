import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Ta bort process.env - använd bara hårdkodat värde eller importera från .env vid behov
axios.defaults.baseURL = 'https://localhost:3000';
const TEXT_LIMIT = 1000;


export default function App() {
  const [text, setText] = useState('');
  const [model, setModel] = useState('gpt-4');
  const [charCount, setCharCount] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [estimate, setEstimate] = useState(null);
  const pollingRef = useRef();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const startPolling = (id) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/analysis/${id}`);
        if (!res.data || !res.data.status) {
          throw new Error('Ogiltigt svar');
        }
        setStatus(res.data.status);
        if (res.data.status === 'completed') {
          setAnalysis(res.data.analysis);
          clearInterval(interval);
        }
        if (res.data.status === 'cancelled' || res.data.status === 'error') {
          clearInterval(interval);
        }
        if (res.data.message) setError(res.data.message);
      } catch (err) {
        setError('Kunde inte hämta status.');
        clearInterval(interval);
      }
    }, 2000);
    pollingRef.current = interval;
  };

  const handleAnalyze = async () => {
    setSubmitting(true);
    setAnalysis('');
    setStatus(null);
    setEstimate(null);
    setError(null);
    setJobId(null);
    try {
      const res = await axios.post('/api/analysis', { text, model });
      setEstimate(res.data.estimatedWait);
      setJobId(res.data.id);
      startPolling(res.data.id);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Kunde inte starta analysen.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    await axios.delete(`/api/analysis/${jobId}`);
    setStatus('cancelled');
    setJobId(null);
    setEstimate(null);
    setAnalysis('');
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  useEffect(() => {
    setCharCount(text.length);
  }, [text]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const processing =
    submitting ||
    (jobId && status !== 'completed' && status !== 'cancelled' && status !== 'error');

  return (
    <div>
      <h1>Textanalys</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, TEXT_LIMIT))}
        rows={10}
        cols={80}
        disabled={processing}
      />
      <div>{charCount}/{TEXT_LIMIT}</div>
      <select value={model} onChange={(e) => setModel(e.target.value)}>
        <option value="gpt-4">gpt-4</option>
        <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
      </select>
      <button
        disabled={
          charCount < 50 ||
          charCount > TEXT_LIMIT ||
          processing
        }
        onClick={handleAnalyze}
      >
        Analysera
      </button>
      {estimate && <div>Beräknad väntetid: {estimate}</div>}
      {processing && (
        <button onClick={handleCancel}>Avbryt</button>
      )}
      {status && <div>Status: {status}</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {analysis && (
        <div>
          <h2>Din ursprungliga text</h2>
          <pre>{text}</pre>
          <h2>Analys enligt See-Think-Do-Care</h2>
          <pre>{analysis}</pre>
        </div>
      )}
    </div>
  );
}
