import Image from 'next/image'
import type { ReactNode } from 'react'

export type CtaFooterProps = {
  title?: string
  subtitle?: string
  actions: ReactNode
  className?: string
}

function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function DecorativeLogo({
  src = '/images/CTA-footer-logo.png',
  alt = '',
  className,
}: {
  src?: string
  alt?: string
  className?: string
}) {
  return (
    <div
      className={cx(
        'pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] translate-x-1/2 opacity-30 select-none',
        className,
      )}
      aria-hidden
    >
      <Image
        src={src}
        alt={alt}
        width={400}
        height={400}
        className="h-[400px] w-[400px] object-contain opacity-80"
        priority
        draggable={false}
      />
    </div>
  )
}

function CTAFooter({
  title = 'CTA Footer Title',
  subtitle = 'CTA Footer Sub Title Lorem Ipsum',
  actions,
  className,
}: CtaFooterProps) {
  return (
    <section
      aria-label="Call to action footer"
      className={cx('relative mt-28 w-full overflow-hidden bg-primary-main', className)}
    >
      <DecorativeLogo alt="" />

      <div className="relative z-[1] mx-auto flex max-w-2xl flex-col items-center px-6 pb-14 pt-16">
        <h2 className="typo-h4 whitespace-nowrap text-center text-white">{title}</h2>
        <p className="typo-sh7 mt-2 text-center text-white">{subtitle}</p>

        <div
          className={cx(
            'mt-8 flex w-[312px] flex-col items-center gap-5',
            'md:mt-10 md:w-auto md:flex-row md:justify-center',
          )}
        >
          {actions}
        </div>
      </div>
    </section>
  )
}

export default CTAFooter
