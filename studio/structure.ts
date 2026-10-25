import type {StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Sadržaj')
    .items([
      S.documentTypeListItem('scooter').title('Skuteri'),
      S.documentTypeListItem('brand').title('Brendovi'),
      S.documentTypeListItem('category').title('Kategorije'),
      S.divider(),
      S.listItem()
        .title('Podešavanja sajta')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
    ])
