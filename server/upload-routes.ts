import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// 업로드 디렉토리 설정
const uploadDir = path.resolve('./public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`업로드 디렉토리 생성됨: ${uploadDir}`);
}

// 스토리지 설정
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  }
});

// 파일 필터 설정 (이미지 파일만 허용)
const fileFilter = (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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

// 라우터 생성
const router = express.Router();

// 다중 이미지 업로드 엔드포인트
router.post('/image', (req, res) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '파일 크기는 5MB를 초과할 수 없습니다.' });
      }
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: '파일이 제공되지 않았습니다.' });
    }
    
    // 모든 파일의 URL 생성
    const fileUrls = req.files.map((file) => {
      return {
        url: `/uploads/${file.filename}`,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size
      };
    });
    
    // 성공 응답
    res.status(200).json({
      success: true,
      images: fileUrls,
      url: fileUrls[0]?.url // 첫 번째 이미지 URL (단일 이미지 호환성 유지)
    });
  });
});

// 이미지 조회 엔드포인트
router.get('/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);
  
  // 파일 존재 여부 확인
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
  }
  
  // 파일 전송
  res.sendFile(filePath);
});

export default router;