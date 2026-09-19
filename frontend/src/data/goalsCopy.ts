export type AudienceType = 'mei_loja_liberal' | 'founder' | 'faceless';

export const AUDIENCE_OPTIONS: { value: AudienceType; label: string; hint: string }[] = [
    {
        value: 'mei_loja_liberal',
        label: 'MEI / loja / liberal',
        hint: 'Confiança local, oferta e prova social',
    },
    {
        value: 'founder',
        label: 'Founder',
        hint: 'Tração, autoridade e produto',
    },
    {
        value: 'faceless',
        label: 'Faceless',
        hint: 'Conteúdo sem rosto, foco na marca',
    },
];
