import Image from "next/image";

export const Logo = ({ className, ...props }: { className?: string } & React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`flex items-center ${className}`} {...props}>
      <Image
        src="/download (4) (1).svg"
        alt="GlobeTrail Logo"
        width={40}
        height={40}
        className="w-10 h-10"
      />
    </div>
  );
};
