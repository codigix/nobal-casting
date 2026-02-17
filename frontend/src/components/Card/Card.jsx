export default function Card({ children, className = '', hoverable = false, ...props }) {
  return (
    <div 
      className={` ${hoverable ? 'hover:' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
