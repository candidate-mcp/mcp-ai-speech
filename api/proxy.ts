import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'API 키가 설정되지 않았습니다.' 
    });
  }

  try {
    // URL에서 경로 추출
    const url = req.url || '';
    const urlObj = new URL(url, `https://${req.headers.host || 'example.com'}`);
    const pathname = urlObj.pathname;
    
    // /api/proxy/ 제거하여 실제 API 경로 추출
    const path = pathname.replace(/^\/api\/proxy\//, '');
    
    if (!path) {
      return res.status(400).json({ error: 'Invalid path' });
    }
    
    // 쿼리 파라미터 재구성
    const queryParams = new URLSearchParams();
    urlObj.searchParams.forEach((value, key) => {
      if (key !== 'path') {
        queryParams.append(key, value);
      }
    });
    
    // API 키 추가
    queryParams.set('key', apiKey);
    
    // 대상 API URL 구성 (Google Generative AI API)
    const baseUrl = 'https://generativelanguage.googleapis.com';
    const finalUrl = `${baseUrl}/${path}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    // 요청 본문 처리
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
    }

    // 요청 헤더 구성
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (req.headers['accept']) {
      headers['Accept'] = req.headers['accept'] as string;
    }

    // API로 프록시 요청
    const response = await fetch(finalUrl, {
      method: req.method,
      headers,
      body,
    });

    const data = await response.text();
    
    // 응답 헤더 복사
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!lowerKey.startsWith('access-control-') && lowerKey !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });
    
    // Content-Type이 없으면 기본값 설정
    if (!response.headers.get('content-type')) {
      res.setHeader('Content-Type', 'application/json');
    }

    return res.status(response.status).send(data);
  } catch (error: any) {
    console.error('API 프록시 오류:', error);
    return res.status(500).json({ 
      error: '프록시 요청 실패', 
      details: error.message
    });
  }
}

