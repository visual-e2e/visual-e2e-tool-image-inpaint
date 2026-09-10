import { Layout } from "antd";
import type { ReactNode } from "react";

interface EditorShellProps {
  header: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  banners?: ReactNode;
}

export function EditorShell({ header, left, center, right, banners }: EditorShellProps) {
  return (
    <Layout className="editor-shell">
      {header}
      {banners}
      <Layout className="editor-shell__body">
        <Layout.Sider
          width={280}
          theme="light"
          collapsible={false}
          trigger={null}
          className="editor-shell__left"
        >
          {left}
        </Layout.Sider>
        <Layout.Content className="editor-shell__center">{center}</Layout.Content>
        <Layout.Sider
          width={120}
          theme="light"
          collapsible={false}
          trigger={null}
          className="editor-shell__right"
        >
          {right}
        </Layout.Sider>
      </Layout>
    </Layout>
  );
}
