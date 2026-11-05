import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="markdown-preview">
      <article className="markdown-document">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          skipHtml
          components={{
            a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
            input: ({ node: _node, ...props }) => <input {...props} disabled />,
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
