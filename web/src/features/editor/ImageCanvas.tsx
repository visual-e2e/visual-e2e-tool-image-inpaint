interface ImageCanvasProps {
  src: string;
  alt?: string;
  children?: React.ReactNode;
}

export function ImageCanvas({ src, alt = "preview", children }: ImageCanvasProps) {
  return (
    <div className="image-canvas">
      <img src={src} alt={alt} className="image-canvas__img" draggable={false} />
      <div className="image-canvas__overlay">{children}</div>
    </div>
  );
}
