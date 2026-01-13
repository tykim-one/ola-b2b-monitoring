"use server";

import { GoogleGenAI } from "@google/genai";
import { B2BLog } from '@/types';

const getClient = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
};

export const analyzeLogs = async (logs: B2BLog[]): Promise<string> => {
  if (!logs || logs.length === 0) return "No logs to analyze.";

  const ai = getClient();
  
  // Take a sample of logs to avoid token limits if the list is huge
  const logSample = logs.slice(0, 30).map(l => 
    `[${l.timestamp}] Level:${l.level} Service:${l.service} Partner:${l.partnerId} Latency:${l.latencyMs}ms Msg:${l.message}`
  ).join('\n');

  const prompt = `
    You are a Senior Site Reliability Engineer (SRE) and Backend Architect.
    
    Context:
    We have a B2B Logging System where logs are ingested into BigQuery and displayed on a NextJS dashboard via a NestJS backend.
    
    Task:
    Analyze the following recent log sample from our system.
    1. Identify any patterns of errors or high latency.
    2. Suggest potential root causes within a NestJS/BigQuery architecture (e.g., query performance, connection pooling, rate limiting).
    3. Provide actionable recommendations for the engineering team.

    Logs:
    ${logSample}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "Analysis failed to produce text.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to analyze logs using Gemini. Please check API Key configuration.";
  }
};
