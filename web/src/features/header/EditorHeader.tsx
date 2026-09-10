import {
  DownloadOutlined,
  FileImageOutlined,
  FileZipOutlined,
  FolderOpenOutlined,
  MoreOutlined,
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
  onRestoreCache?: () => void;
  onSaveCache?: () => void;
  onApplyMaskToAll?: () => void;
  canApplyMaskToAll?: boolean;
  savingCache?: boolean;
}

export function EditorHeader(props: EditorHeaderProps) {
  const {
    onDownloadAll,
    canDownloadAll,
    onUpload,
    uploadDisabled,
    onRestoreCache,
    onSaveCache,
    onApplyMaskToAll,
    canApplyMaskToAll,
    savingCache,
  } = props;

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const moreItems: MenuProps["items"] = [
    onApplyMaskToAll
      ? {
          key: "apply-mask",
          label: "选区复用到全部",
          disabled: !canApplyMaskToAll,
          onClick: () => onApplyMaskToAll(),
        }
      : null,
    onSaveCache
      ? {
          key: "save-cache",
          label: savingCache ? "缓存中…" : "保存缓存",
          disabled: savingCache,
          onClick: () => onSaveCache(),
        }
      : null,
    onRestoreCache
      ? {
          key: "restore-cache",
          label: "恢复缓存",
          onClick: () => onRestoreCache(),
        }
      : null,
  ].filter(Boolean);

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
        {moreItems.length > 0 && (
          <Dropdown menu={{ items: moreItems }} placement="bottomRight">
            <Button icon={<MoreOutlined />}>更多</Button>
          </Dropdown>
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
