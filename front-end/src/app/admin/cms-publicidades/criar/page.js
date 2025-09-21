"use client";
import { useState } from "react";
import Form from "@/components/cms/form";
import FormButton from "@/components/cms/form/fields/Button";
import TextAreaField from "@/components/cms/form/fields/TextAreaField";
import TextField from "@/components/cms/form/fields/TextField";
import UploadField from "@/components/cms/form/fields/UploadField";
import Sidebar from "@/components/cms/Sidebar";
import { UploadOutlined } from "@ant-design/icons";
import PublicidadeImage from "@/components/PublicidadeImage";
import axios from "axios";
import { useRouter } from "next/navigation";
import { message } from "antd";

export default function CriarPublicidadePage() {
  const [fileList, setFileList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  console.log('fileList atual:', fileList);

  const onFinish = async (values) => {
    // Validações mais robustas
    if (!values.titulo || !values.conteudo) {
      message.error("Por favor, preencha todos os campos obrigatórios!");
      return;
    }

    if (!values.titulo.trim()) {
      message.error("O título não pode estar vazio!");
      return;
    }

    if (!values.conteudo.trim()) {
      message.error("O conteúdo não pode estar vazio!");
      return;
    }

    // Validação final antes do envio
    if (fileList.length === 0) {
      message.error("Por favor, selecione uma imagem para a publicidade!");
      return;
    }

    if (fileList.length > 1) {
      message.error("Apenas uma imagem é permitida por publicidade!");
      return;
    }

    try {
      setIsSubmitting(true);
      
      console.log('=== FRONT-END DEBUG ===');
      console.log('values:', values);
      console.log('fileList:', fileList);
      console.log('fileList.length:', fileList.length);
      if (fileList.length > 0) {
        console.log('fileList[0]:', fileList[0]);
        console.log('fileList[0].originFileObj:', fileList[0].originFileObj);
      }
      console.log('========================');

      const formData = new FormData();
      formData.append('titulo', values.titulo.trim());
      formData.append('conteudo', values.conteudo.trim());
      formData.append('usuario_id', '1'); 
      formData.append('ativo', 'true');
      
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('url_imagem', fileList[0].originFileObj);
        console.log('Arquivo adicionado ao FormData:', fileList[0].originFileObj);
      }

      // Log do FormData para debug
      for (let pair of formData.entries()) {
        console.log('FormData entry:', pair[0], pair[1]);
      }

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/publicidade`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.status === 201) {
        message.success("Publicidade cadastrada com sucesso!");
        router.push("/admin/cms-publicidades");
      }
    } catch (error) {
      console.error("Erro ao cadastrar a publicidade:", error);
      
      // Tratamento mais específico de erros
      if (error.response) {
        // Erro do servidor
        const errorMessage = error.response.data?.error || error.response.data?.message || "Erro ao cadastrar a publicidade";
        message.error(errorMessage);
      } else if (error.request) {
        // Erro de rede
        message.error("Erro de conexão. Verifique sua internet e tente novamente.");
      } else {
        // Outro tipo de erro
        message.error("Erro inesperado. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
    message.error("Por favor, corrija os erros no formulário!");
  };

  // Função para limpar o preview quando o arquivo é removido
  const handleFileListChange = (newFileList) => {
    setFileList(newFileList);
  };



  return (
    <>
      <Sidebar />
      <div className="md:ml-20">
        <Form.Body title="Publicidades | Cadastro">
          <Form.FormHeader href="/admin/cms-publicidades" />
          <Form.FormBody onFinish={onFinish} onFinishFailed={onFinishFailed}>
            <div className="flex flex-col w-full gap-2 ">
              <p className="!text-[#0d1b3e] !font-semibold text-[16px]">
                Prévia *
              </p>
              {fileList.length > 0 && fileList[0].originFileObj ? (
                <div className="w-[100%] md:h-[25vh] h-[13vh] bg-gray-200 rounded-3xl relative">
                  <PublicidadeImage
                    url_imagem={URL.createObjectURL(fileList[0].originFileObj)}
                    alt="Prévia da publicidade"
                    width={400}
                    height={320}
                    className="h-full w-full object-cover rounded-3xl"
                  />
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                    ✓ Imagem carregada
                  </div>
                </div>
              ) : (
                <div className="md:h-[25vh] h-[13vh] w-[100%] bg-[#D4D4D4] rounded-3xl flex items-center justify-center text-gray-600 font-semibold text-xl border-2 border-dashed border-gray-400">
                  <div className="text-center">
                    <div>📷</div>
                    <div className="text-sm mt-2">Selecione uma imagem</div>
                  </div>
                </div>
              )}

              <div className="flex md:flex-row flex-col md:gap-6 gap-4">
                <TextField
                  name="titulo"
                  label="Título da campanha de publicidade"
                  placeholder="Título da campanha publicitária"
                  className="!w-[100%]"
                />
                <UploadField
                  name="url_imagem"
                  label="Imagem de capa"
                  className="!w-fit"
                  fileList={fileList}
                  setFileList={handleFileListChange}
                />
              </div>

              <TextAreaField
                name="conteudo"
                label="Corpo"
                placeholder="Corpo da publicação"
                rows={3}
                className="!w-full !h-full"
              />

              <div className="flex justify-end mt-4">
                <FormButton 
                  text={isSubmitting ? "Publicando..." : "Publicar"} 
                  icon={<UploadOutlined />}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </Form.FormBody>
        </Form.Body>
      </div>
    </>
  );
}
