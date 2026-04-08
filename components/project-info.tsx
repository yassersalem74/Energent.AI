import { motion } from "motion/react";
import { VercelIcon } from "./icons";
import { ComputerIcon } from "lucide-react";
import Link from "next/link";

export const ProjectInfo = () => {
  return (
    <motion.div className="w-full px-4">
      <div className="overflow-hidden rounded-[28px] border border-black/10 bg-[linear-gradient(135deg,#fffaf0_0%,#fff1d6_100%)] p-[1px] shadow-[0_24px_44px_-34px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-5 rounded-[27px] bg-white/92 p-8 text-center text-base text-zinc-600 backdrop-blur">
        <p className="flex flex-row justify-center gap-4 items-center text-zinc-900 dark:text-zinc-50">
          <VercelIcon size={16} />
          <span>+</span>
          <ComputerIcon />
        </p>
        <h3 className="text-center text-3xl font-bold tracking-tight text-zinc-950">Computer Use Agent</h3>
        <p className="mx-auto max-w-2xl leading-7">
          This demo showcases a Computer Use Agent built with the{" "}
          <StyledLink href="https://sdk.vercel.ai">AI SDK</StyledLink>,{" "}
          <StyledLink href="https://www.anthropic.com/claude/sonnet">
            Anthropic Claude Sonnet 4.5
          </StyledLink>
          , and{" "}
          <StyledLink href="https://vercel.com/docs/vercel-sandbox">
            Vercel Sandboxes
          </StyledLink>
          .
        </p>
        <p className="mx-auto max-w-xl leading-7">
          {" "}
          Learn more about{" "}
          <Link
            className="text-blue-500 dark:text-blue-400"
            href="https://sdk.vercel.ai/docs/guides/computer-use"
            target="_blank"
          >
            Computer Use{" "}
          </Link>
          with the AI SDK.
        </p>
        </div>
      </div>
    </motion.div>
  );
};

const StyledLink = ({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) => {
  return (
    <Link
      className="text-blue-500 dark:text-blue-400"
      href={href}
      target="_blank"
    >
      {children}
    </Link>
  );
};

// const Code = ({ text }: { text: string }) => {
//   return <code className="">{text}</code>;
// };

export const DeployButton = () => {
  return (
    <Link
      target="_blank"
      href={`https://vercel.com/new/clone?project-name=AI+SDK+Computer+Use+Demo&repository-name=ai-sdk-computer-use&repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fai-sdk-computer-use&demo-title=AI+SDK+Computer+Use+Demo&demo-url=https%3A%2F%2Fai-sdk-computer-use.vercel.app%2F&demo-description=A+chatbot+application+built+with+Next.js+demonstrating+Anthropic+Claude+Sonnet+4.5+computer+use+capabilities+with+Vercel+Sandboxes&env=ANTHROPIC_API_KEY,SANDBOX_SNAPSHOT_ID`}
      className="flex flex-row gap-2 items-center bg-zinc-900 px-3 py-2 rounded-md text-zinc-50 hover:bg-zinc-950 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-50"
    >
      <VercelIcon size={14} />
      Deploy
    </Link>
  );
};
