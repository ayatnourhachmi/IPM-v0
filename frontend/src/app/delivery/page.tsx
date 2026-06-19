import { redirect } from "next/navigation";

type DeliveryPageProps = {
    searchParams: Promise<{ id?: string }>;
};

export default async function DeliveryPage({ searchParams }: DeliveryPageProps) {
    const params = await searchParams;
    const query = params.id ? `?id=${params.id}` : "";
    redirect(`/recos${query}`);
}
