'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo2,
  Redo2,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import './HtmlBodyEditor.css';

interface HtmlBodyEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function HtmlBodyEditor({ value, onChange }: HtmlBodyEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleHeading1 = () => editor.chain().focus().toggleHeading({ level: 1 }).run();
  const toggleHeading2 = () => editor.chain().focus().toggleHeading({ level: 2 }).run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run();
  const toggleCodeBlock = () => editor.chain().focus().toggleCodeBlock().run();
  const undo = () => editor.chain().focus().undo().run();
  const redo = () => editor.chain().focus().redo().run();
  const setLeftAlign = () => editor.chain().focus().setTextAlign('left').run();
  const setCenterAlign = () => editor.chain().focus().setTextAlign('center').run();
  const setRightAlign = () => editor.chain().focus().setTextAlign('right').run();
  const addLink = () => {
    const url = prompt('Ingresa la URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };
  const addImage = () => {
    const url = prompt('Ingresa la URL de la imagen:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const ToolbarButton = ({
    onClick,
    active,
    icon: Icon,
    tooltip,
  }: {
    onClick: () => void;
    active?: boolean;
    icon: React.ComponentType<{ className: string }>;
    tooltip: string;
  }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded transition-colors ${
        active
          ? 'bg-blue-100 text-blue-600'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
      title={tooltip}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 p-3 flex flex-wrap gap-1">
          <div className="flex gap-1 border-r border-gray-300 pr-2">
            <ToolbarButton
              onClick={toggleBold}
              active={editor.isActive('bold')}
              icon={Bold}
              tooltip="Negrita"
            />
            <ToolbarButton
              onClick={toggleItalic}
              active={editor.isActive('italic')}
              icon={Italic}
              tooltip="Cursiva"
            />
          </div>

          <div className="flex gap-1 border-r border-gray-300 pr-2">
            <ToolbarButton
              onClick={toggleHeading1}
              active={editor.isActive('heading', { level: 1 })}
              icon={Heading1}
              tooltip="Título 1"
            />
            <ToolbarButton
              onClick={toggleHeading2}
              active={editor.isActive('heading', { level: 2 })}
              icon={Heading2}
              tooltip="Título 2"
            />
          </div>

          <div className="flex gap-1 border-r border-gray-300 pr-2">
            <ToolbarButton
              onClick={toggleBulletList}
              active={editor.isActive('bulletList')}
              icon={List}
              tooltip="Lista de puntos"
            />
            <ToolbarButton
              onClick={toggleOrderedList}
              active={editor.isActive('orderedList')}
              icon={ListOrdered}
              tooltip="Lista numerada"
            />
          </div>

          <div className="flex gap-1 border-r border-gray-300 pr-2">
            <ToolbarButton
              onClick={toggleBlockquote}
              active={editor.isActive('blockquote')}
              icon={Quote}
              tooltip="Cita"
            />
            <ToolbarButton
              onClick={toggleCodeBlock}
              active={editor.isActive('codeBlock')}
              icon={Code}
              tooltip="Bloque de código"
            />
          </div>

          <div className="flex gap-1 border-r border-gray-300 pr-2">
            <ToolbarButton
              onClick={addLink}
              icon={LinkIcon}
              tooltip="Agregar link"
            />
            <ToolbarButton
              onClick={addImage}
              icon={ImageIcon}
              tooltip="Agregar imagen"
            />
          </div>

          <div className="flex gap-1 border-r border-gray-300 pr-2">
            <ToolbarButton
              onClick={setLeftAlign}
              active={editor.isActive({ textAlign: 'left' })}
              icon={AlignLeft}
              tooltip="Alinear izquierda"
            />
            <ToolbarButton
              onClick={setCenterAlign}
              active={editor.isActive({ textAlign: 'center' })}
              icon={AlignCenter}
              tooltip="Alinear centro"
            />
            <ToolbarButton
              onClick={setRightAlign}
              active={editor.isActive({ textAlign: 'right' })}
              icon={AlignRight}
              tooltip="Alinear derecha"
            />
          </div>

          <div className="flex gap-1">
            <ToolbarButton
              onClick={undo}
              icon={Undo2}
              tooltip="Deshacer"
            />
            <ToolbarButton
              onClick={redo}
              icon={Redo2}
              tooltip="Rehacer"
            />
          </div>
        </div>

        {/* Editor */}
        <div className="prose prose-sm max-w-none">
          <EditorContent editor={editor} className="editor-content" />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        ✓ Editor WYSIWYG - el HTML se genera automáticamente mientras escribes
      </p>
    </div>
  );
}
