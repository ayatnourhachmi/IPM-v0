import { SourcingShell } from "@/components/sourcing/SourcingShell";

type DiscoveryPageProps = {
    searchParams?: {
        id?: string | string[];
    };
};

export default function DiscoveryPage({ searchParams }: DiscoveryPageProps) {
    const idParam = searchParams?.id;
    const initialNeedId = Array.isArray(idParam) ? idParam[0] : idParam;

    return <SourcingShell initialNeedId={initialNeedId} initialState="discovery" />;
}
