export default function Card({ children, className = '', hoverable = false, ...props }) {
  return (
    <div 
      className={`card-base ${hoverable ? 'hover:shadow-lg' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
