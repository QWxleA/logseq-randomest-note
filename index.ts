import '@logseq/libs'
import SettingSchemaDesc from '@logseq/libs/dist/LSPlugin.user';

const choices = ["Entire graph","Limit to seedlings"]
const settingsTemplate:SettingSchemaDesc[] = [{
    key: "includeJournals",
    type: 'boolean',
    default: false,
    title: "include journals?",
    description: "Include journals in random page search.",
  },
  {
    key: "searchTag",
    type: 'string',
    default: "seedling",
    title: "Specific tag to search?",
    description: "Limit search to this tag ('seedling' by default).",
  },
 {
    key: "showTag",
    type: 'enum',
    enumChoices: choices,
    enumPicker: 'radio',
    //default: 0,
    title: "Show entire graph or tagged pages?",
    description: "Choose random  page from everywhere or only by page-tag.",
 }
]
logseq.useSettingsSchema(settingsTemplate)

async function openRandomNote() {
  var query = `
  [:find (pull ?p [*])
    :where
    [_ :block/page ?p]
    [?p :block/journal? false]]`
  if (logseq.settings.includeJournals) {
    query = `
    [:find (pull ?p [*])
      :where
      [_ :block/page ?p]]` 
  }
  if (logseq.settings.showTag == choices[1]) {
    query = `
     [:find (pull ?p [*])
      :where
      [_ :block/page ?p]
      [?p :block/name ?page]
      (not [(= ?page "templates")])
      [?p :block/tags [:block/name "${logseq.settings.searchTag}"]]
     ]` 
  }
  try {
    let ret = await logseq.DB.datascriptQuery(query)
    const pages = ret?.flat()
    if(pages && pages.length > 0) {
      const index = Math.floor(Math.random() * pages.length)
      logseq.App.pushState('page', {
        name: pages[index].name
      })
    }
  } catch (err) {
    console.log(err)
  }
}

function main() {
  logseq.provideModel({
    handleRandomNote() {
      openRandomNote()
  }})

  //logseq.onSettingsChanged((updated) => {
  //  console.log('a2', updated);
  //  console.log('b', updated["showTag"]);
  //}); 

  logseq.provideStyle(`
  .logseq-randomest-note-toolbar .ti-dice {
    font-size: 208px;
    color: green;
  }
  `);

  logseq.setMainUIInlineStyle({
    position: "fixed",
    width: '200px',
  })

  logseq.App.registerUIItem("toolbar", {
    key: 'logseq-randomest-note-toolbar',
    template: `
      <span class="logseq-randomest-note-toolbar flex flex-row">
        <a title="I'm Feeling Lucky" class="button" data-on-click="handleRandomNote">
          <i class="ti ti-dice"></i>
        </a>
      </span>
    `,
  })
}

logseq.ready(main).catch(console.error)
