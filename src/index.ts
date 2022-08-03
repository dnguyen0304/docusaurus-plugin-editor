import pluginContentDocs from '@docusaurus/plugin-content-docs';

import type {
    LoadedContent, PluginOptions
} from '@docusaurus/plugin-content-docs';
import type { LoadContext, Plugin } from '@docusaurus/types';

export default async function pluginEditor(
    context: LoadContext,
    options: PluginOptions,
): Promise<Plugin<LoadedContent>> {
    const wrappedPlugin = await pluginContentDocs(context, options);

    return {
        name: 'plugin-editor',

        extendCli(cli) {
            wrappedPlugin.extendCli!(cli);
        },

        getPathsToWatch() {
            return wrappedPlugin.getPathsToWatch!();
        },

        async loadContent() {
            return wrappedPlugin.loadContent!();
        },

        async contentLoaded({ content, allContent, actions }) {
            await wrappedPlugin.contentLoaded!({
                content,
                allContent,
                actions,
            });
        },

        // This is intentionally left not async to remain consistent with the
        // wrapped code.
        getTranslationFiles({ content }) {
            return wrappedPlugin.getTranslationFiles!({ content });
        },

        translateContent({ content, translationFiles }) {
            return wrappedPlugin.translateContent!({
                content,
                translationFiles,
            });
        },

        configureWebpack(_config, isServer, utils, content) {
            return wrappedPlugin.configureWebpack!(
                _config,
                isServer,
                utils,
                content,
            );
        },
    };
};

export { validateOptions } from '@docusaurus/plugin-content-docs';
