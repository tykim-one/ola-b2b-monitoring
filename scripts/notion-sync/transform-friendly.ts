/**
 * Transform to Non-Developer Friendly Format
 *
 * Transforms AGENTS.md content into a format that non-developers can understand
 * by adding term explanations and generating summaries.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AgentsFile, AgentsTree, getFilesByDepth } from './parse-agents';

interface GlossaryTerm {
  ko: string;
  description: string;
}

interface Glossary {
  terms: Record<string, GlossaryTerm>;
  patterns: Record<string, string>;
}

export interface FriendlyDocument {
  title: string;
  titleKo: string;
  emoji: string;
  summary: string;
  purpose: string;
  purposeFriendly: string;
  keyFiles: Array<{
    name: string;
    description: string;
    descriptionFriendly: string;
  }>;
  subdirectories: Array<{
    name: string;
    nameKo: string;
    path: string;
  }>;
  glossaryTerms: Array<{
    term: string;
    ko: string;
    description: string;
  }>;
  depth: number;
  relativePath: string;
}

/**
 * Load glossary from JSON file
 */
export function loadGlossary(glossaryPath: string): Glossary {
  const content = fs.readFileSync(glossaryPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Find technical terms in text and return matches
 */
export function findTermsInText(text: string, glossary: Glossary): string[] {
  const foundTerms: string[] = [];

  for (const term of Object.keys(glossary.terms)) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    if (regex.test(text)) {
      foundTerms.push(term);
    }
  }

  return [...new Set(foundTerms)];
}

/**
 * Replace technical terms with friendly explanations inline
 */
export function addTermExplanations(text: string, glossary: Glossary): string {
  let result = text;

  for (const [term, info] of Object.entries(glossary.terms)) {
    const regex = new RegExp(`\\b(${term})\\b`, 'gi');
    if (regex.test(result)) {
      // Add Korean translation in parentheses on first occurrence
      result = result.replace(regex, (match, p1, offset) => {
        if (offset === result.indexOf(match)) {
          return `${p1} (${info.ko})`;
        }
        return p1;
      });
    }
  }

  return result;
}

/**
 * Generate a friendly summary from purpose and sections
 */
export function generateSummary(file: AgentsFile, glossary: Glossary): string {
  const dirName = path.basename(file.relativePath) || 'Root';

  // Map common directory names to friendly descriptions
  const dirDescriptions: Record<string, string> = {
    'backend': '서버에서 데이터를 처리하고 API를 제공합니다',
    'frontend': '사용자가 보는 화면과 인터페이스를 담당합니다',
    'frontend-next': '사용자가 보는 화면과 인터페이스를 담당합니다 (Next.js 기반)',
    'metrics': '시스템 사용량과 성능 지표를 수집하고 분석합니다',
    'admin': '관리자 기능과 시스템 설정을 담당합니다',
    'auth': '사용자 로그인과 권한 확인을 처리합니다',
    'users': '사용자 정보를 관리합니다',
    'roles': '사용자 권한과 역할을 관리합니다',
    'filters': '데이터 필터링 조건을 저장하고 관리합니다',
    'analysis': 'AI를 활용한 데이터 분석 기능을 제공합니다',
    'batch-analysis': '대량의 데이터를 주기적으로 분석합니다',
    'cache': '자주 사용하는 데이터를 빠르게 제공하기 위해 저장합니다',
    'datasource': '다양한 데이터 저장소와의 연결을 관리합니다',
    'ml': '머신러닝 기반 분석 기능을 제공합니다',
    'anomaly': '비정상적인 패턴을 자동으로 감지합니다',
    'chatbot': 'AI 챗봇 기능을 제공합니다',
    'quality': '서비스 품질을 측정하고 분석합니다',
    'notifications': '알림 메시지를 발송합니다',
    'components': '재사용 가능한 UI 요소들을 모아놓았습니다',
    'charts': '데이터를 시각적으로 표현하는 차트들입니다',
    'services': '외부 API와 통신하는 기능을 담당합니다',
    'contexts': '여러 화면에서 공유하는 상태를 관리합니다',
    'dto': '데이터 전송 형식을 정의합니다',
    'queries': '데이터베이스 조회 로직을 담당합니다',
    'shared-types': '여러 모듈에서 공유하는 데이터 형식을 정의합니다',
    'prisma': '데이터베이스 스키마와 접근 도구를 관리합니다',
    'src': '실제 프로그램 코드가 들어있습니다',
    'apps': '실행 가능한 애플리케이션들이 모여있습니다',
    'packages': '공유 라이브러리와 도구들이 모여있습니다',
    'docs': '프로젝트 문서와 가이드가 있습니다',
    '.': 'OLA B2B 모니터링 시스템 - LLM 사용량과 품질을 분석하는 대시보드입니다'
  };

  const baseSummary = dirDescriptions[dirName.toLowerCase()] || file.purpose;

  // Add key stats
  const fileCount = file.keyFiles.length;
  const subdirCount = file.subdirectories.length;

  let summary = baseSummary;
  if (fileCount > 0 || subdirCount > 0) {
    const parts = [];
    if (fileCount > 0) parts.push(`${fileCount}개의 주요 파일`);
    if (subdirCount > 0) parts.push(`${subdirCount}개의 하위 폴더`);
    summary += ` (${parts.join(', ')} 포함)`;
  }

  return summary;
}

/**
 * Get emoji for directory based on its purpose
 */
export function getDirectoryEmoji(dirName: string): string {
  const emojiMap: Record<string, string> = {
    'backend': '⚙️',
    'frontend': '🖥️',
    'frontend-next': '🖥️',
    'metrics': '📊',
    'admin': '👤',
    'auth': '🔐',
    'users': '👥',
    'roles': '🎭',
    'filters': '🔍',
    'analysis': '🔬',
    'batch-analysis': '📋',
    'cache': '💾',
    'datasource': '🗄️',
    'ml': '🤖',
    'anomaly': '⚠️',
    'chatbot': '💬',
    'quality': '✅',
    'notifications': '🔔',
    'components': '🧩',
    'charts': '📈',
    'services': '🔌',
    'contexts': '🔗',
    'dto': '📦',
    'queries': '🔎',
    'shared-types': '🔤',
    'prisma': '🗃️',
    'src': '📁',
    'apps': '📱',
    'packages': '📚',
    'docs': '📖',
    '.': '🏠'
  };

  return emojiMap[dirName.toLowerCase()] || '📂';
}

/**
 * Get Korean name for directory
 */
export function getDirectoryKoreanName(dirName: string): string {
  const nameMap: Record<string, string> = {
    'backend': '백엔드 서버',
    'frontend': '프론트엔드',
    'frontend-next': '프론트엔드 (Next.js)',
    'metrics': '메트릭 분석',
    'admin': '관리자 모듈',
    'auth': '인증',
    'users': '사용자 관리',
    'roles': '역할 관리',
    'filters': '필터 관리',
    'analysis': 'AI 분석',
    'batch-analysis': '배치 분석',
    'cache': '캐시',
    'datasource': '데이터 소스',
    'ml': '머신러닝',
    'anomaly': '이상 탐지',
    'chatbot': '챗봇',
    'quality': '품질 분석',
    'notifications': '알림',
    'components': '컴포넌트',
    'charts': '차트',
    'services': '서비스',
    'contexts': '컨텍스트',
    'dto': '데이터 전송 객체',
    'queries': '쿼리',
    'shared-types': '공유 타입',
    'prisma': '데이터베이스',
    'src': '소스 코드',
    'apps': '애플리케이션',
    'packages': '패키지',
    'docs': '문서',
    '.': '루트'
  };

  return nameMap[dirName.toLowerCase()] || dirName;
}

/**
 * Transform an AGENTS.md file to friendly format
 */
export function transformToFriendly(file: AgentsFile, glossary: Glossary): FriendlyDocument {
  const dirName = path.basename(file.relativePath) || '.';

  // Find all technical terms in the content
  const allText = [
    file.purpose,
    ...file.sections.map(s => s.content),
    ...file.keyFiles.map(f => f.description)
  ].join(' ');

  const foundTerms = findTermsInText(allText, glossary);

  return {
    title: dirName === '.' ? 'OLA B2B Monitoring' : dirName,
    titleKo: getDirectoryKoreanName(dirName),
    emoji: getDirectoryEmoji(dirName),
    summary: generateSummary(file, glossary),
    purpose: file.purpose,
    purposeFriendly: addTermExplanations(file.purpose, glossary),
    keyFiles: file.keyFiles.map(f => ({
      name: f.name,
      description: f.description,
      descriptionFriendly: addTermExplanations(f.description, glossary)
    })),
    subdirectories: file.subdirectories.map(s => ({
      name: s.name,
      nameKo: getDirectoryKoreanName(s.name),
      path: s.path
    })),
    glossaryTerms: foundTerms.map(term => ({
      term,
      ko: glossary.terms[term].ko,
      description: glossary.terms[term].description
    })),
    depth: file.depth,
    relativePath: file.relativePath
  };
}

/**
 * Transform entire tree to friendly format
 */
export function transformTreeToFriendly(tree: AgentsTree, glossary: Glossary): FriendlyDocument[] {
  const files = getFilesByDepth(tree);
  return files.map(file => transformToFriendly(file, glossary));
}

// CLI usage
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const { parseAllAgentsFiles } = await import('./parse-agents.js');
  const { fileURLToPath } = await import('url');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const rootPath = process.argv[2] || process.cwd();
  const glossaryPath = path.join(__dirname, 'glossary.json');

  const glossary = loadGlossary(glossaryPath);

  parseAllAgentsFiles(rootPath).then((tree: AgentsTree) => {
    const friendly = transformTreeToFriendly(tree, glossary);

    for (const doc of friendly) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${doc.emoji} ${doc.title} (${doc.titleKo})`);
      console.log(`${'='.repeat(60)}`);
      console.log(`\n📝 요약: ${doc.summary}`);
      console.log(`\n📖 설명: ${doc.purposeFriendly}`);

      if (doc.glossaryTerms.length > 0) {
        console.log(`\n📚 용어 설명:`);
        for (const term of doc.glossaryTerms) {
          console.log(`  - ${term.term} (${term.ko}): ${term.description}`);
        }
      }

      if (doc.keyFiles.length > 0) {
        console.log(`\n📄 주요 파일:`);
        for (const file of doc.keyFiles.slice(0, 5)) {
          console.log(`  - ${file.name}: ${file.descriptionFriendly}`);
        }
      }
    }
  });
}
