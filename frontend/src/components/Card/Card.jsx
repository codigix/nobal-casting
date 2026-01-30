export default function Card({ children, className = '', hoverable = false, ...props }) {
  return (
    <div 
      className={` ${hoverable ? 'hover:shadow-lg' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
