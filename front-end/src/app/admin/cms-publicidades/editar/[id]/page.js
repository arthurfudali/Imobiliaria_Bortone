"use client";
import { useParams, useRouter } from "next/navigation";
import ConfirmModal from "@/components/cms/ConfirmModal";
import Form from "@/components/cms/form";
import FormButton from "@/components/cms/form/fields/Button";
import TextAreaField from "@/components/cms/form/fields/TextAreaField";
import TextField from "@/components/cms/form/fields/TextField";
import UploadField from "@/components/cms/form/fields/UploadField";
import Sidebar from "@/components/cms/Sidebar";
import { UploadOutlined } from "@ant-design/icons";
import PublicidadeImage from "@/components/PublicidadeImage";
import { useEffect, useState } from "react";
import axios from "axios";
import { message } from "antd";

export default function EditarPublicidadePage() {
  const params = useParams(); 
  const id = params?.id;
  const router = useRouter();
  const [fileList, setFileList] = useState([]);
  const [publicidade, setPublicidade] = useState(null);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [formValues, setFormValues] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPublicidade();
    }
  }, [id]);

  const loadPublicidade = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/publicidade/${id}`);
      if (response.status === 200) {
        setPublicidade(response.data);
        setFileList([]);
        console.log('Publicidade carregada:', response.data);
      }
    } catch (error) {
      console.error("Erro ao carregar publicidade:", error);
      message.error("Erro ao carregar a publicidade!");
      router.push("/admin/cms-publicidades");
    } finally {
      setIsLoading(false);
    }
  };

  const onFinish = (values) => {
    // Validações antes de mostrar o modal
    if (!values.titulo || !values.titulo.trim()) {
      message.error("O título não pode estar vazio!");
      return;
    }

    if (!values.conteudo || !values.conteudo.trim()) {
      message.error("O conteúdo não pode estar vazio!");
      return;
    }

    setFormValues(values);
    setIsConfirmModalVisible(true);
  };

  const onConfirm = async () => {
    try {
      setIsSubmitting(true);
      
      console.log('=== FRONT-END DEBUG ===');
      console.log('fileList:', fileList);
      console.log('fileList.length:', fileList.length);
      if (fileList.length > 0) {
        console.log('fileList[0]:', fileList[0]);
        console.log('fileList[0].originFileObj:', fileList[0].originFileObj);
      }
      console.log('formValues:', formValues);
      console.log('publicidade:', publicidade);
      console.log('=======================');
      
      const formData = new FormData();
      formData.append('titulo', formValues.titulo.trim());
      formData.append('conteudo', formValues.conteudo.trim());
      formData.append('usuario_id', publicidade.usuario_id.toString());
      formData.append('ativo', publicidade.ativo.toString());
      
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('url_imagem', fileList[0].originFileObj);
        console.log('Arquivo adicionado ao FormData:', fileList[0].originFileObj.name);
      } else {
        console.log('Nenhum arquivo novo selecionado');
      }

      console.log('FormData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/publicidade/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.status === 200) {
        message.success("Publicidade atualizada com sucesso!");
        setIsConfirmModalVisible(false);
        router.push("/admin/cms-publicidades");
      }
    } catch (error) {
      console.error("Erro ao atualizar a publicidade:", error);
      
      // Tratamento mais específico de erros
      if (error.response) {
        const errorMessage = error.response.data?.error || error.response.data?.message || "Erro ao atualizar a publicidade";
        message.error(errorMessage);
      } else if (error.request) {
        message.error("Erro de conexão. Verifique sua internet e tente novamente.");
      } else {
        message.error("Erro inesperado. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log("Edit Failed:", errorInfo);
    message.error("Por favor, corrija os erros no formulário!");
  };

  const handleFileListChange = (newFileList) => {
    setFileList(newFileList);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Carregando...</span>
      </div>
    );
  }

  if (!publicidade) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Publicidade não encontrada</p>
      </div>
    );
  }

  return (
    <>
      {isConfirmModalVisible && (
        <ConfirmModal
          message="Você tem certeza que deseja alterar o registro definitivamente?"
          onConfirm={onConfirm}
          onCancel={() => setIsConfirmModalVisible(false)}
        />
      )}
      <Sidebar />
      <div className="md:ml-20">
        <Form.Body title="Publicidades | Edição">
          <Form.FormHeader href="/admin/cms-publicidades" />
          <Form.FormBody
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            initialValues={{
              titulo: publicidade.titulo,
              conteudo: publicidade.conteudo,
            }}
          >
            <div className="flex flex-col w-full gap-2 ">
              <p className="!text-[#0d1b3e] !font-semibold text-[16px]">
                Prévia *
              </p>
              {fileList.length > 0 && fileList[0].originFileObj ? (
                <div className="w-[100%] md:h-[25vh] h-[13vh] bg-gray-200 rounded-3xl relative">
                  <PublicidadeImage
                    url_imagem={URL.createObjectURL(fileList[0].originFileObj)}
                    alt="Nova imagem selecionada"
                    width={400}
                    height={320}
                    className="h-full w-full object-cover rounded-3xl"
                  />
                  <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
                    ✓ Nova imagem
                  </div>
                </div>
              ) : publicidade?.url_imagem ? (
                <div className="w-[100%] md:h-[25vh] h-[13vh] bg-gray-200 rounded-3xl relative">
                  <PublicidadeImage
                    url_imagem={publicidade.url_imagem}
                    alt="Imagem atual"
                    width={400}
                    height={320}
                    className="h-full w-full object-cover rounded-3xl"
                  />
                  <div className="absolute top-2 right-2 bg-gray-500 text-white px-2 py-1 rounded text-xs">
                    Imagem atual
                  </div>
                </div>
              ) : (
                <div className="md:h-[25vh] h-[13vh] w-[100%] bg-[#D4D4D4] md:rounded-3xl rounded-xl flex items-center justify-center text-gray-600 font-semibold md:text-xl text-sm border-2 border-dashed border-gray-400">
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
                  text={isSubmitting ? "Atualizando..." : "Atualizar"}
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
