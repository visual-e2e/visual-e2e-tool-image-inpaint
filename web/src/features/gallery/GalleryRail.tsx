import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import { useRef } from "react";
import type { BatchItem } from "../../shared/types/batch.types";
import { GalleryThumb } from "./GalleryThumb";

interface GalleryRailProps {
  items: BatchItem[];
  activeItemId: string | null;
  onSelect: (id: string) => void;
  onRemoveActive: () => void;
  onAddImages: (files: FileList | File[]) => void;
  disabled?: boolean;
}

export function GalleryRail(props: GalleryRailProps) {
  const { items, activeItemId, onSelect, onRemoveActive, onAddImages, disabled } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeIndex = Math.max(
    0,
    items.findIndex((i) => i.id === activeItemId),
  );

  return (
    <div className="gallery-rail">
      <div className="gallery-rail__column">
        <Button
          className="gallery-add"
          disabled={disabled}
          icon={<PlusOutlined />}
          onClick={() => inputRef.current?.click()}
          aria-label="添加图片"
        />
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={(e) => {
            if (e.target.files?.length) onAddImages(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="gallery-rail__list">
          {items.map((item, index) => (
            <GalleryThumb
              key={item.id}
              item={item}
              index={index}
              active={item.id === activeItemId}
              onSelect={() => onSelect(item.id)}
            />
          ))}
        </div>

        <div className="gallery-rail__footer">
          <Typography.Text type="secondary" className="gallery-rail__count">
            {items.length ? `${activeIndex + 1}/${items.length}` : "0/0"}
          </Typography.Text>
          <Button
            type="text"
            danger
            size="small"
            className="gallery-rail__trash"
            icon={<DeleteOutlined />}
            disabled={!activeItemId}
            onClick={onRemoveActive}
            aria-label="删除当前图片"
          />
        </div>
      </div>
    </div>
  );
}
