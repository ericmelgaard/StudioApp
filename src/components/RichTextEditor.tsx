import { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter text...',
  minHeight = '120px'
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet',
    'align',
    'link'
  ];

  return (
    <div className="rich-text-editor-wrapper">
      <style>{`
        .rich-text-editor-wrapper .quill {
          background: white;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
        }

        .rich-text-editor-wrapper .quill:focus-within {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
        }

        .rich-text-editor-wrapper .ql-toolbar {
          border: none;
          border-bottom: 1px solid rgb(226 232 240);
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: rgb(248 250 252);
        }

        .rich-text-editor-wrapper .ql-container {
          border: none;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          font-family: inherit;
          font-size: 0.875rem;
          min-height: ${minHeight};
        }

        .rich-text-editor-wrapper .ql-editor {
          min-height: ${minHeight};
          color: rgb(15 23 42);
        }

        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: rgb(148 163 184);
          font-style: normal;
        }

        .rich-text-editor-wrapper .ql-snow .ql-stroke {
          stroke: rgb(71 85 105);
        }

        .rich-text-editor-wrapper .ql-snow .ql-fill {
          fill: rgb(71 85 105);
        }

        .rich-text-editor-wrapper .ql-snow .ql-picker-label {
          color: rgb(71 85 105);
        }

        .rich-text-editor-wrapper .ql-toolbar button:hover,
        .rich-text-editor-wrapper .ql-toolbar button:focus,
        .rich-text-editor-wrapper .ql-toolbar button.ql-active {
          color: rgb(59 130 246);
        }

        .rich-text-editor-wrapper .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor-wrapper .ql-toolbar button:focus .ql-stroke,
        .rich-text-editor-wrapper .ql-toolbar button.ql-active .ql-stroke {
          stroke: rgb(59 130 246);
        }

        .rich-text-editor-wrapper .ql-toolbar button:hover .ql-fill,
        .rich-text-editor-wrapper .ql-toolbar button:focus .ql-fill,
        .rich-text-editor-wrapper .ql-toolbar button.ql-active .ql-fill {
          fill: rgb(59 130 246);
        }
      `}</style>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
