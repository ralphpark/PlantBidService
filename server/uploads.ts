import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { log } from './vite';

// 업로드 디렉토리 생성
const uploadDir = path.resolve('./public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  log(`Created upload directory: ${uploadDir}`, 'server');
}

// 스토리지 엔진 설정
const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, uploadDir);
  },
  filename: (_req: any, file: any, cb: any) => {
    // 중복 방지를 위한 고유 파일명 생성
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${uniqueId}${extension}`;
    cb(null, filename);
  }
});

// 파일 필터 설정 (이미지 파일만 허용)
const fileFilter = (_req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드할 수 있습니다.'));
  }
};

// 업로드 설정
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  }
});

// 이미지 업로드 핸들러
export async function uploadImage(req: Request, res: Response) {
  try {
    // 다중 파일 업로드 처리 (최대 5개)
    const uploadMultiple = upload.array('images', 5);
    
    uploadMultiple(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '파일 크기는 5MB를 초과할 수 없습니다.' });
        }
        return res.status(400).json({ error: err.message });
      }
      
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: '파일이 제공되지 않았습니다.' });
      }
      
      // 모든 파일 정보 생성
      const fileInfos = req.files.map((file: any) => {
        const fileUrl = `/uploads/${file.filename}`;
        return {
          url: fileUrl,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size
        };
      });
      
      // 성공 응답 (다중 + 단일 호환성)
      res.status(200).json({
        success: true,
        url: fileInfos[0]?.url || null, // 이전 버전 호환성 (단일 이미지 URL)
        imageUrl: fileInfos[0]?.url || null, // 이전 버전 호환성
        images: fileInfos,
        count: fileInfos.length
      });
    });
  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}

// 이미지 조회 (정적 파일로 접근하므로 사실 이 함수는 잘 쓰이지 않음)
export async function getUploadedImage(req: Request, res: Response) {
  const { filename } = req.params;
  
  // 파일 경로
  const filePath = path.join(uploadDir, filename);
  
  // 파일 존재 여부 확인
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '이미지를 찾을 수 없습니다.' });
  }
  
  // 이미지 반환
  res.sendFile(filePath);
}