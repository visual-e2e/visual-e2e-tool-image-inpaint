import {
  DownloadOutlined,
  FileImageOutlined,
  FileZipOutlined,
  FolderOpenOutlined,
  SettingOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Layout, Space, Typography } from "antd";
import type { MenuProps } from "antd";
import { useRef } from "react";

interface EditorHeaderProps {
  onDownloadAll: () => void;
  canDownloadAll: boolean;
  onUpload: (
    files: FileList | File[],
    options?: { fromDirectory?: boolean; zipOnly?: boolean },
  ) => void;
  uploadDisabled?: boolean;
  onOpenInpaintConfig?: () => void;
}

export function EditorHeader(props: EditorHeaderProps) {
  const {
    onDownloadAll,
    canDownloadAll,
    onUpload,
    uploadDisabled,
    onOpenInpaintConfig,
  } = props;

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const uploadItems: MenuProps["items"] = [
    {
      key: "images",
      icon: <FileImageOutlined />,
      label: "上传图片",
      onClick: () => imageInputRef.current?.click(),
    },
    {
      key: "folder",
      icon: <FolderOpenOutlined />,
      label: "上传文件夹",
      onClick: () => folderInputRef.current?.click(),
    },
    {
      key: "zip",
      icon: <FileZipOutlined />,
      label: "上传 ZIP",
      onClick: () => zipInputRef.current?.click(),
    },
  ];

  return (
    <Layout.Header className="editor-header">
      <Typography.Title level={4} className="editor-header__title">
        AI 去水印
      </Typography.Title>
      <Space>
        {onOpenInpaintConfig && (
          <Button icon={<SettingOutlined />} onClick={() => onOpenInpaintConfig()}>
            AI 模型
          </Button>
        )}
        <Dropdown
          menu={{ items: uploadItems }}
          placement="bottomRight"
          disabled={uploadDisabled}
        >
          <Button icon={<UploadOutlined />} disabled={uploadDisabled}>
            上传
          </Button>
        </Dropdown>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          disabled={!canDownloadAll}
          onClick={onDownloadAll}
        >
          下载全部
        </Button>
      </Space>

      <input
        ref={imageInputRef}
        type="file"
        hidden
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={(e) => {
          if (e.target.files?.length) onUpload(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={zipInputRef}
        type="file"
        hidden
        accept=".zip,application/zip,application/x-zip-compressed"
        onChange={(e) => {
          if (e.target.files?.length) onUpload(e.target.files, { zipOnly: true });
          e.target.value = "";
        }}
      />
      <input
        ref={(el) => {
          folderInputRef.current = el;
          if (el) {
            el.setAttribute("webkitdirectory", "");
            el.setAttribute("directory", "");
          }
        }}
        type="file"
        hidden
        multiple
        onChange={(e) => {
          if (e.target.files?.length) {
            onUpload(e.target.files, { fromDirectory: true });
          }
          e.target.value = "";
        }}
      />
    </Layout.Header>
  );
}
