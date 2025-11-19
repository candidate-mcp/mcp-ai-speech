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
    // 경로 추출: Vercel의 rewrites를 통해 전달된 경로 파싱
    let path = '';
    
    // 방법 1: req.url에서 직접 추출 (가장 확실한 방법)
    if (req.url) {
      // req.url은 /api/proxy/v1beta/models/... 형태일 수 있음
      const urlPath = req.url.split('?')[0]; // 쿼리 파라미터 제거
      path = urlPath.replace(/^\/api\/proxy\/?/, ''); // /api/proxy/ 제거
    }
    
    // 방법 2: req.query.path 사용 (Vercel의 동적 경로)
    if (!path && req.query) {
      if (typeof req.query.path === 'string') {
        path = req.query.path;
      } else if (Array.isArray(req.query.path)) {
        path = (req.query.path as string[]).join('/');
      }
    }
    
    // 경로가 여전히 없으면 에러
    if (!path) {
      console.error('Path extraction failed:', {
        url: req.url,
        query: req.query,
        headers: req.headers
      });
      return res.status(400).json({ 
        error: 'Invalid path', 
        details: 'No path provided',
        debug: { url: req.url, query: req.query }
      });
    }
    
    // 쿼리 파라미터 재구성 (path 제외)
    const queryParams = new URLSearchParams();
    if (req.query) {
      Object.entries(req.query).forEach(([key, value]) => {
        if (key !== 'path' && value) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, String(v)));
          } else {
            queryParams.append(key, String(value));
          }
        }
      });
    }
    
    // API 키 추가
    queryParams.set('key', apiKey);
    
    // 대상 API URL 구성 (Google Generative AI API)
    const baseUrl = 'https://generativelanguage.googleapis.com';
    const finalUrl = `${baseUrl}/${path}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    console.log('Proxy request:', {
      originalPath: path,
      finalUrl: finalUrl.replace(apiKey, '***'),
      method: req.method
    });

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

