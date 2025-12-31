import NurseryProfile from '@/components/sharedComponents/nursery-profile'

export default async function NurseryProfilePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return <NurseryProfile nurserySlug={slug} />
}
