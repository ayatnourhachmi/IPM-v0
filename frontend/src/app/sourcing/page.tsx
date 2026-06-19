import { SourcingShell } from "@/components/sourcing/SourcingShell";

type SourcingPageProps = {
    searchParams?: {
        id?: string | string[];
    };
};

export default function SourcingPage({ searchParams }: SourcingPageProps) {
    const idParam = searchParams?.id;
    const initialNeedId = Array.isArray(idParam) ? idParam[0] : idParam;

    return <SourcingShell initialNeedId={initialNeedId} />;
}
