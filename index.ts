import '@logseq/libs'
import SettingSchemaDesc from '@logseq/libs/dist/LSPlugin.user';

var choices = ["Entire graph","Limit to tag"]
const settingsTemplate:SettingSchemaDesc[] = [{
    key: "includeJournals",
    type: 'boolean',
    default: false,
    title: "include journals?",
    description: "Include journals in random page search.",
  },
 {
    key: "showTag",
    type: 'enum',
    enumChoices: choices,
    enumPicker: 'radio',
    default: choices[0],
    title: "Show entire graph or tagged pages?",
    description: "Choose random  page from everywhere or only by page-tag.",
 },
  {
    key: "searchTag",
    type: 'string',
    default: "seedling",
    title: "Specific tag to search?",
    description: "Limit search to this tag ('seedling' by default).",
  },
  {
    key: "coloredIcon",
    type: 'boolean',
    default: true,
    title: "Show colored icon?",
    description: "If yes, then it will be green when the 'tag' is selected",
  }

]
logseq.useSettingsSchema(settingsTemplate)

async function openRandomNote(ranType) {
    console.log("ranType",ranType)
    if ( ranType == choices[0] ) {
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
    } else {
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
      openRandomNote(logseq.settings.showTag)
  }})

  logseq.onSettingsChanged((updated) => {
    //console.log('updated:', updated);
    provideStyle()
  }); 
 
  const provideStyle = () => logseq.provideStyle(` .ti-dice { color:  ${logseq.settings.coloredIcon ? "green" : "var(--ls-primary-text-color)"}; } `);

  logseq.App.registerCommandPalette({
    key: `randomest-note`,
    label: `Show random note`,
    keybinding: {
      mode: 'global',
      binding: 'r r'
    }
  }, async () => { openRandomNote(choices[0]) }); 

  logseq.App.registerCommandPalette({
    key: `randomest-note-s`,
    label: `Show random note (tag)`,
    keybinding: {
      mode: 'global',
      binding: 'r s'
    }
  }, async () => { openRandomNote(choices[1]) }); 

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
