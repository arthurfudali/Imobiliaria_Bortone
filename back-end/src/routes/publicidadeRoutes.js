import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";
import {
getAllPublicidades,
getPublicidadeById,
createPublicidade,
updatePublicidade,
deletePublicidade
} from "../controllers/publicidadeController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar pasta de upload baseada no ambiente
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
let uploadPath;

if (isVercel) {
  // No Vercel, usar pasta temporária
  uploadPath = path.join(os.tmpdir(), 'publicidadeImages');
} else {
  // Em desenvolvimento local, usar pasta public
  uploadPath = path.join(__dirname, '../../../front-end/public/images/publicidadeImages');
}

// Garantir que a pasta de destino existe
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

console.log('Upload path configurado para:', uploadPath);

// Configuração do multer para publicidadeImages
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Multer destination:', uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'publicidade-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Multer filename:', filename);
    cb(null, filename);
  }
});

// Filtros para validar arquivos - apenas 1 imagem
const fileFilter = (req, file, cb) => {
  // Verificar se é uma imagem
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limite
    files: 1, // Apenas 1 arquivo por vez
  }
});

const router = Router();

// Lista todas as publicidades
router.get("/", getAllPublicidades);

// Busca uma publicidade pelo ID
router.get("/:id", getPublicidadeById);

// Cria uma nova publicidade
router.post("/", upload.single('url_imagem'), createPublicidade);

// Atualiza uma publicidade existente
router.put("/:id", upload.single('url_imagem'), updatePublicidade);

// Remove uma publicidade
router.delete("/:id", deletePublicidade);

export default router;
