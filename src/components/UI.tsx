import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'text' | 'circle'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return <button className={`btn btn--${variant} ${className}`.trim()} {...props}>{children}</button>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`surface-card ${className}`.trim()}>{children}</div>
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`field ${className}`.trim()}>{label}{children}</label>
}

export function Badge({ tone = 'neutral', children }: { tone?: 'success' | 'warning' | 'error' | 'neutral'; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}