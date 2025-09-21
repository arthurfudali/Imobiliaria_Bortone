import publicidadeService from "../services/publicidadeService.js";

export const createPublicidade = async (req, res) => {
  try {
    console.log('=== BACK-END DEBUG ===');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    console.log('Environment:', process.env.VERCEL ? 'Vercel' : 'Local');
    console.log('======================');
    
    const { titulo, conteudo, usuario_id, ativo } = req.body;
    
    // Validações mais rigorosas
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: "Título é obrigatório e não pode estar vazio." });
    }

    if (!conteudo || !conteudo.trim()) {
      return res.status(400).json({ error: "Conteúdo é obrigatório e não pode estar vazio." });
    }

    if (!usuario_id) {
      return res.status(400).json({ error: "ID do usuário é obrigatório." });
    }

    // Verificar se uma imagem foi enviada
    if (!req.file) {
      return res.status(400).json({ error: "Uma imagem é obrigatória para criar a publicidade." });
    }
    
    // Configurar URL da imagem baseada no ambiente
    let url_imagem;
    const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
    
    if (isVercel) {
      // No Vercel, a imagem será servida por uma API route ou serviço externo
      // Por enquanto, vamos usar um caminho temporário que pode ser processado depois
      url_imagem = `/api/images/publicidade/${req.file.filename}`;
    } else {
      // Em desenvolvimento local, usar caminho público
      url_imagem = `/images/publicidadeImages/${req.file.filename}`;
    }
    
    console.log('url_imagem calculada:', url_imagem);
    console.log('Arquivo salvo em:', req.file.path);

    // Converter strings para tipos corretos
    const usuarioIdNumber = parseInt(usuario_id, 10);
    const ativoBoolean = ativo === 'true';

    if (isNaN(usuarioIdNumber) || usuarioIdNumber <= 0) {
      return res.status(400).json({ error: "ID do usuário deve ser um número inteiro positivo." });
    }

    const novaPublicidade = await publicidadeService.createPublicidade({
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      url_imagem,
      usuario_id: usuarioIdNumber,
      ativo: ativoBoolean,
    });

    return res.status(201).json({
      message: "Publicidade criada com sucesso!",
      publicidade: novaPublicidade
    });
  } catch (error) {
    console.error("Erro ao criar publicidade:", error);
    
    // Tratar diferentes tipos de erro
    if (error.name === 'MulterError') {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "Arquivo muito grande. O tamanho máximo é 5MB." });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: "Apenas uma imagem é permitida por publicidade." });
      }
      return res.status(400).json({ error: "Erro no upload do arquivo: " + error.message });
    }
    
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
};

export const getAllPublicidades = async (req, res) => {
  try {
    const { titulo, usuario_id, ordenarPor, direcao, page, limit } = req.query;

    console.log('Query params recebidos:', { titulo, usuario_id, ordenarPor, direcao, page, limit });

    const resultado = await publicidadeService.getAllPublicidades({
      titulo,
      usuario_id,
      ordenarPor,
      direcao,
      page,
      limit,
    });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Erro ao buscar publicidades:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getPublicidadeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido, deve ser numérico" });
    }

    const publicidade = await publicidadeService.getPublicidadeById(Number(id));

    if (!publicidade) {
      return res.status(404).json({ error: "Publicidade não encontrada" });
    }

    return res.status(200).json(publicidade);
  } catch (error) {
    console.error("Erro ao buscar publicidade por ID:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const updatePublicidade = async (req, res) => {
  try {
    console.log('=== UPDATE DEBUG ===');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);
    console.log('req.params:', req.params);
    console.log('===================');
    
    const { id } = req.params;
    const { titulo, conteudo, usuario_id, ativo } = req.body;
    
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: "ID inválido. O ID deve ser numérico." });
    }

    // Preparar dados para atualização - apenas campos que foram enviados
    const updateData = {};
    
    // Converter tipos se necessário e adicionar apenas campos presentes
    if (titulo !== undefined) {
      updateData.titulo = titulo;
    }
    
    if (conteudo !== undefined) {
      updateData.conteudo = conteudo;
    }
    
    if (usuario_id !== undefined) {
      const usuarioIdNumber = parseInt(usuario_id, 10);
      if (isNaN(usuarioIdNumber) || usuarioIdNumber <= 0) {
        return res.status(400).json({ error: "ID do usuário deve ser um número inteiro positivo." });
      }
      updateData.usuario_id = usuarioIdNumber;
    }
    
    if (ativo !== undefined) {
      const ativoBoolean = ativo === 'true' || ativo === true;
      updateData.ativo = ativoBoolean;
    }
    
    // Se há arquivo enviado, usar o caminho completo baseado no ambiente
    if (req.file) {
      const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;
      
      if (isVercel) {
        updateData.url_imagem = `/api/images/publicidade/${req.file.filename}`;
      } else {
        updateData.url_imagem = `/images/publicidadeImages/${req.file.filename}`;
      }
      
      console.log('Nova url_imagem:', updateData.url_imagem);
    }
    
    console.log('updateData:', updateData);
    
    const publicidadeAtualizada = await publicidadeService.updatePublicidade(Number(id), updateData);

    return res.status(200).json({
      message: "Publicidade atualizada com sucesso",
      publicidade: publicidadeAtualizada,
    });
  } catch (error) {
    console.error("Erro ao atualizar publicidade:", error);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
};

export const deletePublicidade = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({ message: "ID inválido. O ID deve ser numérico." });
    }

    const publicidadeExistente = await publicidadeService.getPublicidadeById(Number(id));
    if (!publicidadeExistente) {
      return res.status(404).json({ error: "Publicidade não encontrada" });
    }

    await publicidadeService.deletePublicidade(Number(id));

    return res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar publicidade:", error);
    return res.status(500).json({ error: "Erro interno ao tentar excluir a publicidade." });
  }
};